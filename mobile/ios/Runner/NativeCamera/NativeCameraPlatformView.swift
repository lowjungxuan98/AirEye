import Flutter
import UIKit

final class NativeCameraPlatformView: NSObject, FlutterPlatformView {
    private let container: NativeCameraPreviewView
    private let session: NativeCameraSession
    private let methodChannel: FlutterMethodChannel
    private let eventChannel: FlutterEventChannel
    private let eventSink: NativeCameraEventSink

    init(frame: CGRect,
         viewId: Int64,
         args: [String: Any],
         messenger: FlutterBinaryMessenger) {
        let initialMode = NativeCameraMode(rawString: args["mode"] as? String ?? "normal")
        let autoCapture = args["autoCaptureEnabled"] as? Bool ?? true

        container = NativeCameraPreviewView(frame: frame)
        eventSink = NativeCameraEventSink()
        session = NativeCameraSession(
            previewView: container,
            mode: initialMode,
            autoCaptureEnabled: autoCapture,
            eventSink: eventSink
        )
        methodChannel = FlutterMethodChannel(
            name: "aireye/native_camera/method/\(viewId)",
            binaryMessenger: messenger
        )
        eventChannel = FlutterEventChannel(
            name: "aireye/native_camera/events/\(viewId)",
            binaryMessenger: messenger
        )

        super.init()

        eventChannel.setStreamHandler(eventSink)
        methodChannel.setMethodCallHandler { [weak self] call, result in
            self?.handle(call: call, result: result)
        }

        let tapRecognizer = UITapGestureRecognizer(target: self, action: #selector(handlePreviewTap(_:)))
        container.addGestureRecognizer(tapRecognizer)
    }

    func view() -> UIView { container }

    private func handle(call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "start":
            session.start { error in
                if let error {
                    result(FlutterError(code: "start_failed", message: error.localizedDescription, details: nil))
                } else {
                    result(nil)
                }
            }
        case "stop":
            session.stop()
            result(nil)
        case "setMode":
            let modeRaw = (call.arguments as? [String: Any])?["mode"] as? String ?? "normal"
            session.setMode(NativeCameraMode(rawString: modeRaw))
            result(nil)
        case "setAutoCaptureEnabled":
            let enabled = (call.arguments as? [String: Any])?["enabled"] as? Bool ?? true
            session.setAutoCaptureEnabled(enabled)
            result(nil)
        case "capture":
            let reason = (call.arguments as? [String: Any])?["reason"] as? String ?? "manual"
            session.requestCapture(reason: reason)
            result(nil)
        case "dispose":
            session.stop()
            result(nil)
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    @objc private func handlePreviewTap(_ recognizer: UITapGestureRecognizer) {
        guard recognizer.state == .ended else { return }

        let location = recognizer.location(in: container)
        guard container.bounds.contains(location) else { return }

        let devicePoint = container.previewLayer.captureDevicePointConverted(fromLayerPoint: location)
        session.focus(at: CGPoint(
            x: min(max(devicePoint.x, 0), 1),
            y: min(max(devicePoint.y, 0), 1)
        ))
        container.showFocusIndicator(at: location)
    }

    deinit {
        session.tearDownSync(previewView: container)
        methodChannel.setMethodCallHandler(nil)
        eventChannel.setStreamHandler(nil)
    }
}
