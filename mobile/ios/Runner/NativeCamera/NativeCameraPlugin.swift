import Flutter
import UIKit

/// Entry point for the native AVFoundation camera surface that Flutter embeds
/// via `UiKitView`.
public final class NativeCameraPlugin {
    public static let viewTypeId = "aireye/native_camera_view"

    public static func register(with registrar: FlutterPluginRegistrar) {
        let factory = NativeCameraViewFactory(messenger: registrar.messenger())
        registrar.register(factory, withId: viewTypeId)
    }
}

final class NativeCameraViewFactory: NSObject, FlutterPlatformViewFactory {
    private let messenger: FlutterBinaryMessenger

    init(messenger: FlutterBinaryMessenger) {
        self.messenger = messenger
        super.init()
    }

    func createArgsCodec() -> FlutterMessageCodec & NSObjectProtocol {
        FlutterStandardMessageCodec.sharedInstance()
    }

    func create(withFrame frame: CGRect,
                viewIdentifier viewId: Int64,
                arguments args: Any?) -> FlutterPlatformView {
        NativeCameraPlatformView(
            frame: frame,
            viewId: viewId,
            args: args as? [String: Any] ?? [:],
            messenger: messenger
        )
    }
}
