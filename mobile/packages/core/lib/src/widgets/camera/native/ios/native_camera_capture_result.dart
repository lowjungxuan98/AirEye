/// Metadata returned by the native camera after a successful capture.
///
/// The image bytes are intentionally not part of this object — only the
/// local file path is passed through the MethodChannel boundary, and the
/// upload layer reads the file directly.
class NativeCameraCaptureResult {
  const NativeCameraCaptureResult({
    required this.imagePath,
    required this.width,
    required this.height,
    required this.fileSize,
    required this.platform,
    required this.captureReason,
    required this.timestamp,
  });

  final String imagePath;
  final int width;
  final int height;
  final int fileSize;
  final String platform;
  final String captureReason;
  final int timestamp;

  factory NativeCameraCaptureResult.fromMap(Map<dynamic, dynamic> map) {
    return NativeCameraCaptureResult(
      imagePath: map['imagePath'] as String,
      width: (map['width'] as num?)?.toInt() ?? 0,
      height: (map['height'] as num?)?.toInt() ?? 0,
      fileSize: (map['fileSize'] as num?)?.toInt() ?? 0,
      platform: map['platform'] as String? ?? 'unknown',
      captureReason: map['captureReason'] as String? ?? 'unknown',
      timestamp: (map['timestamp'] as num?)?.toInt() ?? DateTime.now().millisecondsSinceEpoch,
    );
  }

  @override
  String toString() => 'NativeCameraCaptureResult(path=$imagePath, ${width}x$height, '
      '${fileSize}B, platform=$platform, reason=$captureReason)';
}

/// Capture modes the native side knows about. The native evaluators may
/// apply different exposure/contrast tuning for each mode.
enum NativeCameraMode {
  normal,
  screenText,
}

extension NativeCameraModeChannelName on NativeCameraMode {
  String get channelName {
    switch (this) {
      case NativeCameraMode.normal:
        return 'normal';
      case NativeCameraMode.screenText:
        return 'screenText';
    }
  }
}
