import AVFoundation
import UIKit

final class NativeCameraSession: NSObject {
    private let previewView: NativeCameraPreviewView
    private let eventSink: NativeCameraEventSink

    private let sessionQueue = DispatchQueue(label: "aireye.native_camera.session")
    private let session = AVCaptureSession()
    private var device: AVCaptureDevice?
    private let photoOutput = AVCapturePhotoOutput()
    private let videoOutput = AVCaptureVideoDataOutput()
    private let videoSampleQueue = DispatchQueue(label: "aireye.native_camera.frames")

    private var mode: NativeCameraMode
    private var autoCaptureEnabled: Bool
    private var isStarted = false
    private var isCapturing = false
    private var hasEmittedReady = false

    private let evaluator = AutoCaptureEvaluator()
    private var capturePhotoDelegateRetained: PhotoCaptureDelegate?

    init(previewView: NativeCameraPreviewView,
         mode: NativeCameraMode,
         autoCaptureEnabled: Bool,
         eventSink: NativeCameraEventSink) {
        self.previewView = previewView
        self.mode = mode
        self.autoCaptureEnabled = autoCaptureEnabled
        self.eventSink = eventSink
        super.init()
    }

    func start(completion: @escaping (Error?) -> Void) {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            sessionQueue.async { self.configureAndRun(completion: completion) }
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                guard let self else { return }
                if granted {
                    self.sessionQueue.async { self.configureAndRun(completion: completion) }
                } else {
                    Self.completeWithPermissionDenied(completion)
                }
            }
        default:
            Self.completeWithPermissionDenied(completion)
        }
    }

    func stop() {
        sessionQueue.async {
            guard self.isStarted else { return }
            self.isStarted = false
            if self.session.isRunning { self.session.stopRunning() }
        }
    }

    func tearDownSync(previewView: NativeCameraPreviewView) {
        if Thread.isMainThread {
            previewView.previewLayer.session = nil
        } else {
            DispatchQueue.main.sync {
                previewView.previewLayer.session = nil
            }
        }

        sessionQueue.sync {
            self.isStarted = false
            if self.session.isRunning { self.session.stopRunning() }
            for input in self.session.inputs { self.session.removeInput(input) }
            for output in self.session.outputs { self.session.removeOutput(output) }
            self.videoOutput.setSampleBufferDelegate(nil, queue: nil)
            self.device = nil
        }
    }

    func setMode(_ newMode: NativeCameraMode) {
        sessionQueue.async {
            self.mode = newMode
            self.applyModeTuning()
        }
    }

    func setAutoCaptureEnabled(_ enabled: Bool) {
        sessionQueue.async {
            self.autoCaptureEnabled = enabled
            if !enabled { self.evaluator.reset() }
        }
    }

    func requestCapture(reason: String) {
        sessionQueue.async {
            guard !self.isCapturing else { return }
            self.triggerCapture(reason: reason)
        }
    }

    func focus(at point: CGPoint) {
        sessionQueue.async {
            guard let device = self.device else { return }

            do {
                try device.lockForConfiguration()
                defer { device.unlockForConfiguration() }

                if device.isFocusPointOfInterestSupported {
                    device.focusPointOfInterest = point
                }
                if device.isFocusModeSupported(.autoFocus) {
                    device.focusMode = .autoFocus
                } else if device.isFocusModeSupported(.continuousAutoFocus) {
                    device.focusMode = .continuousAutoFocus
                }

                if device.isExposurePointOfInterestSupported {
                    device.exposurePointOfInterest = point
                }
                if device.isExposureModeSupported(.autoExpose) {
                    device.exposureMode = .autoExpose
                } else if device.isExposureModeSupported(.continuousAutoExposure) {
                    device.exposureMode = .continuousAutoExposure
                }

                self.evaluator.reset()
            } catch {
                // Best effort; a transient focus lock failure should not stop preview/capture.
            }
        }
    }

    func handleVideoSampleBuffer(_ sampleBuffer: CMSampleBuffer) {
        guard isStarted else { return }

        if !hasEmittedReady {
            hasEmittedReady = true
            eventSink.send(["type": "ready"])
        }

        guard autoCaptureEnabled, !isCapturing, let device else { return }
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let context = AutoCaptureContext(
            isAdjustingFocus: device.isAdjustingFocus,
            isAdjustingExposure: device.isAdjustingExposure,
            pixelBuffer: pixelBuffer
        )

        if evaluator.shouldCapture(in: context) {
            triggerCapture(reason: evaluator.lastReason ?? "auto")
        }
    }

    private static func completeWithPermissionDenied(_ completion: @escaping (Error?) -> Void) {
        DispatchQueue.main.async {
            completion(NSError(
                domain: "NativeCamera",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Camera permission denied."]
            ))
        }
    }

    private func configureAndRun(completion: @escaping (Error?) -> Void) {
        if isStarted {
            DispatchQueue.main.async { completion(nil) }
            return
        }

        do {
            try configureSession()
        } catch {
            DispatchQueue.main.async { completion(error) }
            eventSink.send(["type": "error", "message": error.localizedDescription])
            return
        }

        DispatchQueue.main.async {
            self.previewView.previewLayer.session = self.session
            if let previewConnection = self.previewView.previewLayer.connection,
               previewConnection.isVideoOrientationSupported {
                previewConnection.videoOrientation = .landscapeRight
            }
        }

        session.startRunning()
        isStarted = true
        applyModeTuning()
        DispatchQueue.main.async { completion(nil) }
    }

    private func configureSession() throws {
        session.beginConfiguration()
        defer { session.commitConfiguration() }

        if session.canSetSessionPreset(.photo) {
            session.sessionPreset = .photo
        }

        for input in session.inputs { session.removeInput(input) }
        for output in session.outputs { session.removeOutput(output) }

        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            throw nativeCameraError(code: -2, message: "No back camera available.")
        }
        self.device = device

        let input = try AVCaptureDeviceInput(device: device)
        guard session.canAddInput(input) else {
            throw nativeCameraError(code: -3, message: "Cannot add camera input.")
        }
        session.addInput(input)

        guard session.canAddOutput(photoOutput) else {
            throw nativeCameraError(code: -4, message: "Cannot add photo output.")
        }
        session.addOutput(photoOutput)

        if #available(iOS 16.0, *) {
            photoOutput.maxPhotoDimensions = device.activeFormat.supportedMaxPhotoDimensions.last ?? CMVideoDimensions(width: 0, height: 0)
        } else {
            photoOutput.isHighResolutionCaptureEnabled = true
        }

        videoOutput.setSampleBufferDelegate(self, queue: videoSampleQueue)
        videoOutput.alwaysDiscardsLateVideoFrames = true
        videoOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
        if session.canAddOutput(videoOutput) {
            session.addOutput(videoOutput)
            if let connection = videoOutput.connection(with: .video),
               connection.isVideoOrientationSupported {
                connection.videoOrientation = .landscapeRight
            }
        }

        if let photoConnection = photoOutput.connection(with: .video),
           photoConnection.isVideoOrientationSupported {
            photoConnection.videoOrientation = .landscapeRight
        }

        configureDevice(device)
    }

    private func configureDevice(_ device: AVCaptureDevice) {
        do {
            try device.lockForConfiguration()
            defer { device.unlockForConfiguration() }

            if device.hasFlash { device.flashMode = .off }
            if device.isFocusModeSupported(.continuousAutoFocus) {
                device.focusMode = .continuousAutoFocus
            }
            if device.isFocusPointOfInterestSupported {
                device.focusPointOfInterest = CGPoint(x: 0.5, y: 0.5)
            }
            if device.isExposureModeSupported(.continuousAutoExposure) {
                device.exposureMode = .continuousAutoExposure
            }
            if device.isExposurePointOfInterestSupported {
                device.exposurePointOfInterest = CGPoint(x: 0.5, y: 0.5)
            }
        } catch {
            // Best effort; default device settings are usable.
        }
    }

    private func applyModeTuning() {
        guard let device else { return }

        do {
            try device.lockForConfiguration()
            defer { device.unlockForConfiguration() }

            let targetBias: Float = mode == .screenText ? -0.7 : 0.0
            let clamped = max(device.minExposureTargetBias, min(device.maxExposureTargetBias, targetBias))
            device.setExposureTargetBias(clamped, completionHandler: nil)
        } catch {
            // Best effort; capture can continue without exposure tuning.
        }
    }

    private func triggerCapture(reason: String) {
        guard !isCapturing, isStarted else { return }
        isCapturing = true
        eventSink.send(["type": "capturing"])

        let settings: AVCapturePhotoSettings
        if photoOutput.availablePhotoCodecTypes.contains(.jpeg) {
            settings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.jpeg])
        } else {
            settings = AVCapturePhotoSettings()
        }
        settings.flashMode = .off

        if #available(iOS 16.0, *) {
            settings.maxPhotoDimensions = photoOutput.maxPhotoDimensions
        } else {
            settings.isHighResolutionPhotoEnabled = true
        }

        let delegate = PhotoCaptureDelegate(reason: reason) { [weak self] result in
            guard let self else { return }
            self.sessionQueue.async {
                self.isCapturing = false
                self.capturePhotoDelegateRetained = nil
                self.evaluator.markCaptured()
                switch result {
                case .success(let payload):
                    self.eventSink.send(payload)
                case .failure(let error):
                    self.eventSink.send(["type": "error", "message": error.localizedDescription])
                }
            }
        }
        capturePhotoDelegateRetained = delegate
        photoOutput.capturePhoto(with: settings, delegate: delegate)
    }

    private func nativeCameraError(code: Int, message: String) -> NSError {
        NSError(domain: "NativeCamera", code: code, userInfo: [NSLocalizedDescriptionKey: message])
    }
}
