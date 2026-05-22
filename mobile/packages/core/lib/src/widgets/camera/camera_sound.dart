part of 'high_quality_camera_widget.dart';

class _CameraSound {
  static const _channel = MethodChannel('grim/camera_sound');
  static var _iosShutterDisposed = false;

  static Future<void> prepare() async {
    if (!Platform.isIOS || _iosShutterDisposed) return;
    try {
      await _channel.invokeMethod<void>('disposeShutterSound');
      _iosShutterDisposed = true;
    } catch (_) {
      // Best-effort; if the channel is unavailable we leave the system sound in place.
    }
  }

  static Future<void> mute() async {
    if (!Platform.isAndroid) return;
    try {
      await _channel.invokeMethod<void>('muteSystemSound');
    } catch (_) {}
  }

  static Future<void> unmute() async {
    if (!Platform.isAndroid) return;
    try {
      await _channel.invokeMethod<void>('unmuteSystemSound');
    } catch (_) {}
  }
}
