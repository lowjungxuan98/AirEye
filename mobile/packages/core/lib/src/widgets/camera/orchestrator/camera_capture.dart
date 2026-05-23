import 'dart:io';

import 'package:cross_file/cross_file.dart';

import '../native/ios/native_camera_capture_result.dart';

/// Unified capture result produced by either camera backend (hybrid
/// `camera` package or native AVFoundation). The orchestrator normalises
/// per-backend payloads into this shape so callers only ever see one
/// type.
class CameraCapture {
  const CameraCapture({
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

  factory CameraCapture.fromNative(NativeCameraCaptureResult result) {
    return CameraCapture(
      imagePath: result.imagePath,
      width: result.width,
      height: result.height,
      fileSize: result.fileSize,
      platform: result.platform,
      captureReason: result.captureReason,
      timestamp: result.timestamp,
    );
  }

  static Future<CameraCapture> fromXFile(
    XFile file, {
    String captureReason = 'manual',
    int? width,
    int? height,
  }) async {
    final stat = await File(file.path).stat();
    return CameraCapture(
      imagePath: file.path,
      width: width ?? 0,
      height: height ?? 0,
      fileSize: stat.size,
      platform: Platform.isIOS ? 'ios' : Platform.operatingSystem,
      captureReason: captureReason,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    );
  }
}

/// Camera modes recognised by the orchestrator. Native backend uses
/// these for exposure tuning; hybrid backend ignores them today.
enum CameraMode { normal, screenText }
