import AVFoundation
import UIKit

final class NativeCameraPreviewView: UIView {
    private weak var focusIndicator: UIView?

    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }

    var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .black
        previewLayer.videoGravity = .resizeAspect
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) not supported") }

    func showFocusIndicator(at point: CGPoint) {
        focusIndicator?.removeFromSuperview()

        let size: CGFloat = 72
        let indicator = UIView(frame: CGRect(x: point.x - size / 2, y: point.y - size / 2, width: size, height: size))
        indicator.isUserInteractionEnabled = false
        indicator.layer.borderColor = UIColor.systemYellow.cgColor
        indicator.layer.borderWidth = 1.5
        indicator.layer.cornerRadius = 4
        indicator.alpha = 1
        indicator.transform = CGAffineTransform(scaleX: 1.5, y: 1.5)

        addSubview(indicator)
        focusIndicator = indicator

        UIView.animate(
            withDuration: 0.18,
            delay: 0,
            options: [.curveEaseOut],
            animations: {
                indicator.transform = .identity
            },
            completion: { _ in
                UIView.animate(
                    withDuration: 0.35,
                    delay: 0.55,
                    options: [.curveEaseIn],
                    animations: {
                        indicator.alpha = 0
                    },
                    completion: { _ in
                        indicator.removeFromSuperview()
                    }
                )
            }
        )
    }
}
