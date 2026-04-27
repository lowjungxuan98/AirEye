part of 'high_quality_camera_widget.dart';

class HighQualityCameraController {
  _HighQualityCameraWidgetState? _state;

  bool get isAttached => _state != null;

  bool get isReady => _state?._isCameraReady ?? false;

  bool get isTakingPicture => _state?._isTakingPicture ?? false;

  Future<XFile?> takePicture() =>
      _state?._takePicture() ?? Future<XFile?>.value();

  void _attach(_HighQualityCameraWidgetState state) {
    _state = state;
  }

  void _detach(_HighQualityCameraWidgetState state) {
    if (identical(_state, state)) {
      _state = null;
    }
  }
}

class _HighQualityCameraWidgetState extends State<HighQualityCameraWidget>
    with WidgetsBindingObserver {
  CameraController? _controller;
  Object? _error;
  var _isTakingPicture = false;
  var _isInitializing = false;
  var _isSettingFocusPoint = false;
  var _focusY = 0.5;
  double? _pendingFocusY;
  var _initializationId = 0;

  @override
  void initState() {
    super.initState();
    widget.controller?._attach(this);
    WidgetsBinding.instance.addObserver(this);
    _initCamera();
  }

  @override
  void didUpdateWidget(covariant HighQualityCameraWidget oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.controller != widget.controller) {
      oldWidget.controller?._detach(this);
      widget.controller?._attach(this);
    }

    if (oldWidget.lensDirection != widget.lensDirection ||
        oldWidget.resolutionPreset != widget.resolutionPreset) {
      _initCamera();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _controller;

    if (state == AppLifecycleState.inactive) {
      _controller = null;
      controller?.dispose();
      return;
    }

    if (state == AppLifecycleState.resumed && controller == null) {
      _initCamera();
    }
  }

  Future<void> _initCamera() async {
    if (_isInitializing) return;

    final initializationId = ++_initializationId;
    final previousController = _controller;
    _controller = null;
    _isInitializing = true;

    if (mounted && previousController != null) {
      setState(() {});
    }

    await previousController?.dispose();

    try {
      final cameras = await availableCameras();

      if (cameras.isEmpty) {
        throw StateError('No cameras found on this device.');
      }

      final selectedCamera = cameras.firstWhere(
        (camera) => camera.lensDirection == widget.lensDirection,
        orElse: () => cameras.first,
      );

      final controller = CameraController(
        selectedCamera,
        widget.resolutionPreset,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await controller.initialize();
      await controller.setFlashMode(FlashMode.off);
      await controller.setFocusMode(FocusMode.locked);
      await controller.setFocusPoint(Offset(0.5, _focusY));
      await controller.setExposureMode(ExposureMode.auto);

      if (!mounted || initializationId != _initializationId) {
        await controller.dispose();
        return;
      }

      setState(() {
        _controller = controller;
        _error = null;
      });
    } catch (error) {
      if (!mounted || initializationId != _initializationId) return;

      setState(() {
        _error = error;
      });
    } finally {
      if (initializationId == _initializationId) {
        _isInitializing = false;
      }
    }
  }

  bool get _isCameraReady {
    final controller = _controller;
    return controller != null && controller.value.isInitialized;
  }

  Future<XFile?> _takePicture() async {
    final controller = _controller;

    if (controller == null || !controller.value.isInitialized) return null;
    if (_isTakingPicture || controller.value.isTakingPicture) return null;

    try {
      setState(() {
        _isTakingPicture = true;
      });

      final image = await controller.takePicture();

      if (!mounted) return null;

      widget.onImageCaptured(image);
      return image;
    } catch (error) {
      if (!mounted) return null;

      setState(() {
        _error = error;
      });
      return null;
    } finally {
      if (mounted) {
        setState(() {
          _isTakingPicture = false;
        });
      }
    }
  }

  void _onFocusYChanged(double value) {
    final focusY = 1 - value;

    setState(() {
      _focusY = focusY;
    });

    _setFocusY(focusY);
  }

  Future<void> _setFocusY(double value) async {
    final controller = _controller;

    if (controller == null || !controller.value.isInitialized) return;

    if (_isSettingFocusPoint) {
      _pendingFocusY = value;
      return;
    }

    _isSettingFocusPoint = true;

    try {
      await controller.setFocusMode(FocusMode.locked);
      await controller.setFocusPoint(Offset(0.5, value));
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _error = error;
      });
    } finally {
      _isSettingFocusPoint = false;

      final pendingFocusY = _pendingFocusY;
      _pendingFocusY = null;

      if (mounted && pendingFocusY != null && pendingFocusY != value) {
        await _setFocusY(pendingFocusY);
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _initializationId++;
    widget.controller?._detach(this);
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _HighQualityCameraView(
      controller: _controller,
      error: _error,
      focusY: _focusY,
      isTakingPicture: _isTakingPicture,
      previewFit: widget.previewFit,
      showCaptureButton: widget.showCaptureButton,
      loadingWidget: widget.loadingWidget,
      errorWidget: widget.errorWidget,
      onFocusYChanged: _onFocusYChanged,
      onTakePicture: _takePicture,
    );
  }
}
