import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';

import '../hybrid/high_quality_camera_widget.dart';
import '../native/ios/native_camera_capture_result.dart';
import '../native/ios/native_camera_controller.dart';
import 'camera_capture.dart';

/// Picks the camera backend based on the runtime platform. iOS uses the
/// native AVFoundation surface; everything else falls back to the hybrid
/// `camera`-package widget.
enum CameraBackend {
  hybrid,
  nativeIos;

  static CameraBackend autoForPlatform() {
    return Platform.isIOS ? CameraBackend.nativeIos : CameraBackend.hybrid;
  }
}

/// Unified controller exposed to callers regardless of backend.
///
/// Auto-capture semantics:
///  - Native backend: the native auto-evaluator decides when the scene
///    is stable + focused enough to fire. Arming just enables it.
///  - Hybrid backend: there is no native evaluator, so arming
///    synthesises a single immediate capture. Callers that want
///    repeated auto-captures on hybrid must re-arm after each event.
class CameraOrchestratorController {
  CameraOrchestratorController({
    CameraMode mode = CameraMode.screenText,
    bool autoCaptureEnabled = false,
    CameraBackend? backend,
  })  : backend = backend ?? CameraBackend.autoForPlatform(),
        _mode = mode,
        _autoCaptureEnabled = autoCaptureEnabled {
    switch (this.backend) {
      case CameraBackend.nativeIos:
        _native = NativeCameraController(
          initialMode: _toNativeMode(mode),
          autoCaptureEnabled: autoCaptureEnabled,
        )
          ..onCaptured = _handleNativeCaptured
          ..onError = _emitError
          ..onPreviewReady = _emitPreviewReady;
      case CameraBackend.hybrid:
        _hybrid = HighQualityCameraController();
    }
  }

  final CameraBackend backend;

  CameraMode _mode;
  bool _autoCaptureEnabled;
  bool _disposed = false;

  NativeCameraController? _native;
  HighQualityCameraController? _hybrid;

  Timer? _hybridReadyPoller;
  bool _hybridReadyEmitted = false;

  void Function(CameraCapture capture)? onCaptured;
  void Function(String message)? onError;
  VoidCallback? onPreviewReady;

  CameraMode get mode => _mode;
  bool get autoCaptureEnabled => _autoCaptureEnabled;

  bool get isAttached {
    return switch (backend) {
      CameraBackend.nativeIos => _native?.isAttached ?? false,
      CameraBackend.hybrid => _hybrid?.isAttached ?? false,
    };
  }

  bool get isReady {
    return switch (backend) {
      CameraBackend.nativeIos => _native?.isAttached ?? false,
      CameraBackend.hybrid => _hybrid?.isReady ?? false,
    };
  }

  Future<void> armAutoCapture(bool enabled) async {
    _autoCaptureEnabled = enabled;
    switch (backend) {
      case CameraBackend.nativeIos:
        await _native?.setAutoCaptureEnabled(enabled);
      case CameraBackend.hybrid:
        if (enabled) {
          await captureNow(reason: 'auto:hybrid_armed');
        }
    }
  }

  Future<CameraCapture?> captureNow({String reason = 'manual'}) async {
    if (_disposed) return null;
    switch (backend) {
      case CameraBackend.nativeIos:
        await _native?.requestManualCapture(reason: reason);
        return null;
      case CameraBackend.hybrid:
        final hybrid = _hybrid;
        if (hybrid == null || !hybrid.isReady) return null;
        try {
          final file = await hybrid.takePicture();
          if (file == null) return null;
          final capture = await CameraCapture.fromXFile(file, captureReason: reason);
          onCaptured?.call(capture);
          return capture;
        } catch (e) {
          _emitError(e.toString());
          return null;
        }
    }
  }

  Future<void> setMode(CameraMode mode) async {
    _mode = mode;
    if (backend == CameraBackend.nativeIos) {
      await _native?.setMode(_toNativeMode(mode));
    }
  }

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    _hybridReadyPoller?.cancel();
    _hybridReadyPoller = null;
    await _native?.dispose();
    _native = null;
    _hybrid = null;
  }

  @internal
  NativeCameraController? get nativeController => _native;

  @internal
  HighQualityCameraController? get hybridController => _hybrid;

  @internal
  void handleHybridImage(dynamic file) async {
    if (file == null) return;
    try {
      final capture = await CameraCapture.fromXFile(file, captureReason: 'hybrid:onCaptured');
      onCaptured?.call(capture);
    } catch (e) {
      _emitError(e.toString());
    }
  }

  @internal
  void startHybridReadyPoller() {
    if (backend != CameraBackend.hybrid || _hybridReadyEmitted) return;
    _hybridReadyPoller?.cancel();
    _hybridReadyPoller = Timer.periodic(const Duration(milliseconds: 150), (timer) {
      if (_disposed || _hybridReadyEmitted) {
        timer.cancel();
        return;
      }
      if (_hybrid?.isReady ?? false) {
        _hybridReadyEmitted = true;
        timer.cancel();
        _emitPreviewReady();
      }
    });
  }

  void _handleNativeCaptured(NativeCameraCaptureResult result) {
    onCaptured?.call(CameraCapture.fromNative(result));
  }

  void _emitError(String message) => onError?.call(message);
  void _emitPreviewReady() => onPreviewReady?.call();

  NativeCameraMode _toNativeMode(CameraMode mode) {
    switch (mode) {
      case CameraMode.normal:
        return NativeCameraMode.normal;
      case CameraMode.screenText:
        return NativeCameraMode.screenText;
    }
  }
}
