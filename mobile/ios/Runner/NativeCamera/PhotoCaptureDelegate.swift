import AVFoundation
import Foundation

final class PhotoCaptureDelegate: NSObject, AVCapturePhotoCaptureDelegate {
    typealias Completion = (Result<[String: Any], Error>) -> Void

    private let reason: String
    private let completion: Completion

    init(reason: String, completion: @escaping Completion) {
        self.reason = reason
        self.completion = completion
    }

    func photoOutput(_ output: AVCapturePhotoOutput,
                     didFinishProcessingPhoto photo: AVCapturePhoto,
                     error: Error?) {
        if let error {
            completion(.failure(error))
            return
        }

        guard let data = photo.fileDataRepresentation() else {
            completion(.failure(NSError(
                domain: "NativeCamera",
                code: -10,
                userInfo: [NSLocalizedDescriptionKey: "Photo file data unavailable."]
            )))
            return
        }

        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("aireye_capture_\(Int(Date().timeIntervalSince1970 * 1000)).jpg")

        do {
            try data.write(to: url, options: .atomic)
        } catch {
            completion(.failure(error))
            return
        }

        let dimensions = photo.resolvedSettings.photoDimensions
        completion(.success([
            "type": "captured",
            "imagePath": url.path,
            "width": Int(dimensions.width),
            "height": Int(dimensions.height),
            "fileSize": data.count,
            "platform": "ios",
            "captureReason": reason,
            "timestamp": Int(Date().timeIntervalSince1970 * 1000)
        ]))
    }
}
