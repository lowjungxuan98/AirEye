import AudioToolbox
import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private static let cameraSoundChannelName = "grim/camera_sound"

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)

    let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "GrimCameraSoundPlugin")
    guard let messenger = registrar?.messenger() else { return }

    let channel = FlutterMethodChannel(
      name: AppDelegate.cameraSoundChannelName,
      binaryMessenger: messenger
    )
    channel.setMethodCallHandler { call, result in
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
  }
}
