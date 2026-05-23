import AudioToolbox
import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private static let cameraSoundChannelName = "aireye/camera_sound"
  private static let imageClipboardChannelName = "aireye/image_clipboard"

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)

    if let nativeCameraRegistrar = engineBridge.pluginRegistry.registrar(forPlugin: "AirEyeNativeCameraPlugin") {
      NativeCameraPlugin.register(with: nativeCameraRegistrar)
    }

    let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "AirEyeCameraSoundPlugin")
    guard let messenger = registrar?.messenger() else { return }

    let cameraSoundChannel = FlutterMethodChannel(
      name: AppDelegate.cameraSoundChannelName,
      binaryMessenger: messenger
    )
    cameraSoundChannel.setMethodCallHandler { call, result in
      switch call.method {
      case "disposeShutterSound":
        // System sound 1108 is the camera shutter on iOS. Disposing it stops
        // it from being played by AVCapturePhotoOutput.
        AudioServicesDisposeSystemSoundID(1108)
        result(nil)
      default:
        result(FlutterMethodNotImplemented)
      }
    }

    let imageClipboardChannel = FlutterMethodChannel(
      name: AppDelegate.imageClipboardChannelName,
      binaryMessenger: messenger
    )
    imageClipboardChannel.setMethodCallHandler { call, result in
      switch call.method {
      case "copyImage":
        guard let bytes = call.arguments as? FlutterStandardTypedData,
              let image = UIImage(data: bytes.data) else {
          result(FlutterError(code: "invalid_image", message: "Unable to decode image bytes.", details: nil))
          return
        }

        UIPasteboard.general.image = image
        result(nil)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }
}
