import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:grim_core/grim_core.dart';

import '../../application/grim_sender_camera_providers.dart';
import '../../application/grim_sender_capture_flow_controller.dart';
import '../widgets/grim_sender_capture_status.dart';

class GrimSenderCameraPage extends ConsumerStatefulWidget {
  const GrimSenderCameraPage({super.key});

  @override
  ConsumerState<GrimSenderCameraPage> createState() => _GrimSenderCameraPageState();
}

class _GrimSenderCameraPageState extends ConsumerState<GrimSenderCameraPage> {
  static const double _radius = 28;

  final GrimCameraPreviewController _cameraController = GrimCameraPreviewController();
  GrimSenderCaptureFlowState _flowState = const GrimSenderCaptureFlowState.idle();
  late final GrimSenderCaptureFlowController _flowController;

  @override
  void initState() {
    super.initState();
    SystemChrome.setPreferredOrientations(const [DeviceOrientation.landscapeLeft, DeviceOrientation.landscapeRight]);
    _flowController = ref.read(grimSenderCaptureFlowControllerProvider);
    _flowController.bind(
      _cameraController,
      onStateChanged: (state) {
        if (!mounted) {
          return;
        }
        setState(() => _flowState = state);
      },
    );
  }

  @override
  void dispose() {
    _flowController.unbind();
    SystemChrome.setPreferredOrientations(DeviceOrientation.values);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: GrimColors.canvas,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: SizedBox.expand(
            child: Material(
              color: GrimColors.surface,
              clipBehavior: Clip.antiAlias,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(_radius),
                side: BorderSide(color: GrimColors.outline),
              ),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  GrimCameraPreview(controller: _cameraController),
                  Positioned(left: 16, right: 16, bottom: 16, child: GrimSenderCaptureStatus(state: _flowState)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
