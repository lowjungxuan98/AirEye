import 'package:camera/camera.dart';
import 'package:flutter/material.dart';

import '../../theme/grim_colors.dart';
import '../grim_camera_manager.dart';

class GrimCameraPreviewController {
  CameraController? _controller;

  bool get isReady => _controller?.value.isInitialized ?? false;

  Future<String> takePicturePath() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      throw StateError('Camera is not ready.');
    }
    if (controller.value.isTakingPicture) {
      throw StateError('Camera is already taking a picture.');
    }

    final file = await controller.takePicture();
    return file.path;
  }

  void _attach(CameraController controller) {
    _controller = controller;
  }

  void _detach(CameraController controller) {
    if (identical(_controller, controller)) {
      _controller = null;
    }
  }

  void _detachAll() {
    _controller = null;
  }
}

class GrimCameraPreview extends StatefulWidget {
  const GrimCameraPreview({super.key, this.controller, this.label = 'Live camera feed'});

  final GrimCameraPreviewController? controller;
  final String label;

  @override
  State<GrimCameraPreview> createState() => _GrimCameraPreviewState();
}

class _GrimCameraPreviewState extends State<GrimCameraPreview> with WidgetsBindingObserver {
  CameraController? _controller;
  List<CameraDescription> _cameras = const [];
  String? _errorMessage;
  bool _isInitializing = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeCamera();
  }

  @override
  void didUpdateWidget(covariant GrimCameraPreview oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller == widget.controller) {
      return;
    }

    oldWidget.controller?._detachAll();
    final controller = _controller;
    if (controller != null && controller.value.isInitialized) {
      widget.controller?._attach(controller);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return;
    }

    if (state == AppLifecycleState.inactive) {
      _disposeController(updateState: true);
      return;
    }

    if (state == AppLifecycleState.resumed) {
      _initializeCamera();
    }
  }

  Future<void> _initializeCamera() async {
    setState(() {
      _errorMessage = null;
      _isInitializing = true;
    });

    try {
      final cameras = _cameras.isEmpty ? await GrimCameraManager.availableCamerasList() : _cameras;

      if (cameras.isEmpty) {
        throw CameraException('NoCameraAvailable', 'No cameras were found on this device.');
      }

      final bestBackCamera = GrimCameraManager.pickBestBackCamera(cameras);
      final nextController = await GrimCameraManager.createController(bestBackCamera);
      final previousController = _controller;

      if (!mounted) {
        await nextController.dispose();
        return;
      }

      setState(() {
        _cameras = cameras;
        _controller = nextController;
        _isInitializing = false;
      });

      widget.controller?._attach(nextController);
      if (previousController != null) {
        widget.controller?._detach(previousController);
      }
      await previousController?.dispose();
    } on CameraException catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _errorMessage = error.description ?? error.code;
        _isInitializing = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _errorMessage = 'Unable to start the camera preview.';
        _isInitializing = false;
      });
    }
  }

  Future<void> _disposeController({required bool updateState}) async {
    final controller = _controller;
    _controller = null;
    if (controller != null) {
      widget.controller?._detach(controller);
    }

    if (updateState && mounted) {
      setState(() {});
    }

    await controller?.dispose();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    widget.controller?._detachAll();
    _disposeController(updateState: false);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        Positioned.fill(child: _buildBody()),
        Positioned(
          left: 16,
          top: 16,
          child: Text(
            widget.label,
            style: const TextStyle(color: Color(0xFF8B8B7A), fontSize: 13, fontWeight: FontWeight.w500),
          ),
        ),
      ],
    );
  }

  Widget _buildBody() {
    if (_isInitializing) {
      return const ColoredBox(
        color: GrimColors.surface,
        child: Center(child: CircularProgressIndicator(strokeWidth: 2, color: GrimColors.accent)),
      );
    }

    final errorMessage = _errorMessage;
    if (errorMessage != null) {
      return ColoredBox(
        color: GrimColors.surface,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.camera_alt_outlined, color: GrimColors.placeholderIcon, size: 42),
                const SizedBox(height: 12),
                Text(
                  errorMessage,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: GrimColors.muted, fontSize: 13, height: 1.4),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return const SizedBox.shrink();
    }

    return CameraPreview(controller);
  }
}
