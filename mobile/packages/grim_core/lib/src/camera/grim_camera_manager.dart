import 'package:camera/camera.dart';

class GrimCameraManager {
  const GrimCameraManager._();

  static Future<List<CameraDescription>> availableCamerasList() {
    return availableCameras();
  }

  static Future<CameraController> createController(
    CameraDescription camera, {
    ResolutionPreset resolutionPreset = ResolutionPreset.high,
    bool enableAudio = false,
  }) async {
    final controller = CameraController(camera, resolutionPreset, enableAudio: enableAudio);

    await controller.initialize();
    return controller;
  }
}
