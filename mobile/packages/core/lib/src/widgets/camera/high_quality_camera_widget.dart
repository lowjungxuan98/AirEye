import 'package:camera/camera.dart';
import 'package:flutter/material.dart';

import 'camera_error_view.dart';
import 'camera_focus_slider.dart';

part 'high_quality_camera_controller.dart';
part 'high_quality_camera_view.dart';

enum CameraPreviewFit { cover, contain }

class HighQualityCameraWidget extends StatefulWidget {
  const HighQualityCameraWidget({
    super.key,
    required this.onImageCaptured,
    this.lensDirection = CameraLensDirection.back,
    this.resolutionPreset = ResolutionPreset.max,
    this.previewFit = CameraPreviewFit.cover,
    this.showCaptureButton = true,
    this.controller,
    this.loadingWidget,
    this.errorWidget,
  });

  final CameraLensDirection lensDirection;
  final ResolutionPreset resolutionPreset;
  final CameraPreviewFit previewFit;
  final bool showCaptureButton;
  final HighQualityCameraController? controller;
  final ValueChanged<XFile> onImageCaptured;
  final Widget? loadingWidget;
  final Widget? errorWidget;

  @override
  State<HighQualityCameraWidget> createState() =>
      _HighQualityCameraWidgetState();
}
