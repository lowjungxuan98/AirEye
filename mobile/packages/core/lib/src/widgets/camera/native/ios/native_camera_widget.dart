import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';

import 'native_camera_capture_result.dart';
import 'native_camera_controller.dart';

/// Embeds a fully native camera preview (AVFoundation on iOS). The host
/// owns a [NativeCameraController] and receives capture results (file
/// path + metadata) via the controller's callbacks — no image bytes
/// cross the platform channel.
class NativeCameraWidget extends StatefulWidget {
  const NativeCameraWidget({
    super.key,
    required this.controller,
    this.mode = NativeCameraMode.normal,
    this.autoCaptureEnabled = true,
    this.startAutomatically = true,
    this.loadingWidget,
    this.errorBuilder,
  });

  static const String viewType = 'aireye/native_camera_view';

  final NativeCameraController controller;
  final NativeCameraMode mode;
  final bool autoCaptureEnabled;
  final bool startAutomatically;

  final Widget? loadingWidget;
  final Widget Function(BuildContext context, String error)? errorBuilder;

  @override
  State<NativeCameraWidget> createState() => _NativeCameraWidgetState();
}

class _NativeCameraWidgetState extends State<NativeCameraWidget> {
  String? _error;
  bool _viewCreated = false;

  @override
  void initState() {
    super.initState();
    _attachErrorListener();
  }

  @override
  void didUpdateWidget(covariant NativeCameraWidget oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.controller != widget.controller) {
      _attachErrorListener();
    }
    if (oldWidget.mode != widget.mode) {
      widget.controller.setMode(widget.mode);
    }
    if (oldWidget.autoCaptureEnabled != widget.autoCaptureEnabled) {
      widget.controller.setAutoCaptureEnabled(widget.autoCaptureEnabled);
    }
  }

  void _attachErrorListener() {
    final originalErrorCb = widget.controller.onError;
    widget.controller.onError = (msg) {
      if (mounted) {
        setState(() {
          _error = msg;
        });
      }
      originalErrorCb?.call(msg);
    };
  }

  void _onPlatformViewCreated(int id) {
    if (!mounted) return;
    widget.controller.attach(id);
    setState(() => _viewCreated = true);
    if (widget.startAutomatically) {
      widget.controller.start();
    }
  }

  @override
  Widget build(BuildContext context) {
    final error = _error;
    if (error != null) {
      return widget.errorBuilder?.call(context, error) ?? _NativeCameraErrorView(error: error);
    }

    final creationParams = <String, dynamic>{
      'mode': widget.mode.channelName,
      'autoCaptureEnabled': widget.autoCaptureEnabled,
    };

    Widget platformView;
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      platformView = UiKitView(
        viewType: NativeCameraWidget.viewType,
        creationParams: creationParams,
        creationParamsCodec: const StandardMessageCodec(),
        onPlatformViewCreated: _onPlatformViewCreated,
      );
    } else if (defaultTargetPlatform == TargetPlatform.android) {
      platformView = PlatformViewLink(
        viewType: NativeCameraWidget.viewType,
        surfaceFactory: (context, controller) {
          return AndroidViewSurface(
            controller: controller as AndroidViewController,
            gestureRecognizers: const <Factory<OneSequenceGestureRecognizer>>{},
            hitTestBehavior: PlatformViewHitTestBehavior.opaque,
          );
        },
        onCreatePlatformView: (params) {
          return PlatformViewsService.initSurfaceAndroidView(
            id: params.id,
            viewType: NativeCameraWidget.viewType,
            layoutDirection: TextDirection.ltr,
            creationParams: creationParams,
            creationParamsCodec: const StandardMessageCodec(),
            onFocus: () => params.onFocusChanged(true),
          )
            ..addOnPlatformViewCreatedListener(params.onPlatformViewCreated)
            ..addOnPlatformViewCreatedListener(_onPlatformViewCreated)
            ..create();
        },
      );
    } else {
      platformView = const Center(
        child: Text('Native camera is only supported on iOS and Android.'),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        platformView,
        if (!_viewCreated) widget.loadingWidget ?? const Center(child: CircularProgressIndicator()),
      ],
    );
  }

  @override
  void dispose() {
    widget.controller.detach();
    super.dispose();
  }
}

class _NativeCameraErrorView extends StatelessWidget {
  const _NativeCameraErrorView({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          'Camera error: $error',
          textAlign: TextAlign.center,
          style: TextStyle(color: Theme.of(context).colorScheme.error),
        ),
      ),
    );
  }
}
