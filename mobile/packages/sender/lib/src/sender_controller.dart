import 'dart:developer' as dev;
import 'dart:io';

import 'package:core/core.dart';

import 'sender_state.dart';

class SenderController extends BaseController<SenderState> {
  static const _logTag = 'SenderController';

  final cameraController = CameraOrchestratorController(mode: CameraMode.screenText, autoCaptureEnabled: false);

  var _isHandlingCaptureRequest = false;
  var _isDisposed = false;

  @override
  SenderState build() {
    AirEyeFcmManager.subscribeForeground(ref, _handleForegroundMessage, onDispose: _handleDispose);

    cameraController
      ..onPreviewReady = _handlePreviewReady
      ..onCaptured = _handleCaptured
      ..onError = _handleCameraError;

    return const SenderInitial();
  }

  @override
  bool get isLoading => state is SenderLoading || state is SenderCapturing;

  @override
  void setLoading() => state = const SenderLoading();

  @override
  void setError(String message) => state = SenderError(message);

  void _handleDispose() {
    _isDisposed = true;
    cameraController.dispose();
  }

  void _handlePreviewReady() {
    if (_isDisposed) return;
    if (state is SenderInitial || state is SenderLoading) {
      _setState(const SenderReady());
    }
  }

  void _handleCameraError(String message) {
    dev.log('camera error: $message', name: _logTag);
    _setState(SenderError(message));
  }

  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    final data = message.data;

    if (data['kind'] != 'capture_request') return;
    if (!_isSenderTarget(data)) return;

    await _armForCapture();
  }

  bool _isSenderTarget(Map<String, dynamic> data) {
    final role = data['role']?.toString();
    final targetRole = data['targetRole']?.toString();

    return role == 'sender' || targetRole == 'sender';
  }

  /// Arms the camera's auto-capture path. On the native backend this just
  /// flips the AVFoundation evaluator on; on the hybrid backend it
  /// synthesises a single immediate capture. Either way [_handleCaptured]
  /// is invoked when the picture lands.
  Future<void> _armForCapture() async {
    if (_isHandlingCaptureRequest) return;
    if (!cameraController.isAttached) {
      dev.log('capture_request ignored because camera is not attached', name: _logTag);
      return;
    }

    _isHandlingCaptureRequest = true;
    _setState(const SenderCapturing());

    try {
      await cameraController.armAutoCapture(true);
    } catch (e, st) {
      dev.log('failed to arm auto-capture', name: _logTag, error: e, stackTrace: st);
      _isHandlingCaptureRequest = false;
      _setState(SenderError(e.toString()));
    }
  }

  Future<void> _handleCaptured(CameraCapture capture) async {
    // Disarm immediately so a second capture doesn't fire mid-upload.
    await cameraController.armAutoCapture(false);

    try {
      final file = File(capture.imagePath);
      if (!await file.exists()) {
        throw StateError('Captured image missing at ${capture.imagePath}');
      }

      final response = await AirEyeEndpoints.import(image: await MultipartFile.fromFile(capture.imagePath, filename: _imageFilename(capture.imagePath)));

      dev.log(
        'capture_request image queued from ${capture.imagePath} '
        '(${capture.width}x${capture.height}, ${capture.fileSize}B, '
        'reason=${capture.captureReason}, backend=${cameraController.backend}, '
        'jobId=${response.jobId}, uploadId=${response.uploadId})',
        name: _logTag,
      );
      _setState(const SenderReady());

      // Best-effort: delete temp file once uploaded.
      try {
        await file.delete();
      } catch (_) {}
    } catch (error, stackTrace) {
      dev.log('capture_request upload failed', name: _logTag, error: error, stackTrace: stackTrace);
      _setState(SenderError(error.toString()));
    } finally {
      _isHandlingCaptureRequest = false;
    }
  }

  String _imageFilename(String path) {
    final pathParts = path.split(RegExp(r'[/\\]'));
    final pathFilename = pathParts.isEmpty ? '' : pathParts.last.trim();
    return pathFilename.isNotEmpty ? pathFilename : 'capture.jpg';
  }

  void _setState(SenderState nextState) {
    if (!_isDisposed) {
      state = nextState;
    }
  }
}

final senderControllerProvider = BaseNotifierProvider<SenderController, SenderState>(SenderController.new);
