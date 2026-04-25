import 'package:camera/camera.dart';

class GrimCameraManager {
  const GrimCameraManager._();

  static Future<List<CameraDescription>> availableCamerasList() {
    return availableCameras();
  }

  /// Prefers the rear wide lens (main sensor on phones like Pixel 10), then any
  /// rear camera reported as [CameraLensType.unknown], then the first rear camera.
  static CameraDescription pickBestBackCamera(List<CameraDescription> cameras) {
    final backCameras = cameras.where((c) => c.lensDirection == CameraLensDirection.back).toList();

    if (backCameras.isEmpty) {
      throw CameraException('NoBackCamera', 'No back-facing camera was found on this device.');
    }

    CameraDescription? findByLens(CameraLensType type) {
      for (final camera in backCameras) {
        if (camera.lensType == type) {
          return camera;
        }
      }
      return null;
    }

    return findByLens(CameraLensType.wide) ??
        findByLens(CameraLensType.unknown) ??
        backCameras.first;
  }

  /// Rear telephoto (e.g. native 5x); use with a dedicated [CameraController] when optical zoom is required.
  static CameraDescription? findBackTelephotoCamera(List<CameraDescription> cameras) {
    for (final camera in cameras) {
      if (camera.lensDirection == CameraLensDirection.back && camera.lensType == CameraLensType.telephoto) {
        return camera;
      }
    }
    return null;
  }

  static Future<void> _tryApplyDefaultStillCaptureModes(CameraController controller) async {
    if (!controller.value.isInitialized) {
      return;
    }

    Future<void> apply(Future<void> Function() action) async {
      try {
        await action();
      } on CameraException {
        // Flash / focus / exposure auto may be unsupported on some devices.
      }
    }

    await apply(() => controller.setFlashMode(FlashMode.auto));
    await apply(() => controller.setFocusMode(FocusMode.auto));
    await apply(() => controller.setExposureMode(ExposureMode.auto));
  }

  static Future<CameraController> createController(
    CameraDescription camera, {
    ResolutionPreset resolutionPreset = ResolutionPreset.max,
    bool enableAudio = false,
    bool applyDefaultStillCaptureModes = true,
  }) async {
    final controller = CameraController(camera, resolutionPreset, enableAudio: enableAudio);

    await controller.initialize();
    if (applyDefaultStillCaptureModes) {
      await _tryApplyDefaultStillCaptureModes(controller);
    }
    return controller;
  }
}
