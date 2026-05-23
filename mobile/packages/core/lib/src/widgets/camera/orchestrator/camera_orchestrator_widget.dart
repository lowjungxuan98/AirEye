import 'package:camera/camera.dart' show CameraLensDirection, ResolutionPreset;
import 'package:flutter/material.dart';

import '../hybrid/high_quality_camera_widget.dart';
import '../native/ios/native_camera_capture_result.dart';
import '../native/ios/native_camera_widget.dart';
import 'camera_capture.dart';
import 'camera_orchestrator_controller.dart';

/// Backend-agnostic camera surface. Decides at build time which
/// underlying widget to mount based on the controller's [CameraBackend].
class CameraOrchestratorWidget extends StatelessWidget {
  const CameraOrchestratorWidget({
    super.key,
    required this.controller,
    this.mode = CameraMode.screenText,
    this.autoCaptureEnabled = false,
    this.previewFit = CameraPreviewFit.contain,
  });

  final CameraOrchestratorController controller;
  final CameraMode mode;
  final bool autoCaptureEnabled;
  final CameraPreviewFit previewFit;

  @override
  Widget build(BuildContext context) {
    switch (controller.backend) {
      case CameraBackend.nativeIos:
        final native = controller.nativeController!;
        return NativeCameraWidget(
          controller: native,
          mode: mode == CameraMode.screenText
              ? NativeCameraMode.screenText
              : NativeCameraMode.normal,
          autoCaptureEnabled: autoCaptureEnabled,
        );
      case CameraBackend.hybrid:
        final hybrid = controller.hybridController!;
        controller.startHybridReadyPoller();
        return HighQualityCameraWidget(
          controller: hybrid,
          previewFit: previewFit,
          showCaptureButton: false,
          lensDirection: CameraLensDirection.back,
          resolutionPreset: ResolutionPreset.max,
          onImageCaptured: controller.handleHybridImage,
        );
    }
  }
}
