import 'dart:developer' as dev;

import 'package:core/core.dart';
import 'sender_state.dart';

class SenderController extends BaseController<SenderState> {
  static const _logTag = 'SenderController';

  final cameraController = HighQualityCameraController();
  var _isHandlingCaptureRequest = false;
  var _isDisposed = false;

  @override
  SenderState build() {
    GrimFcmManager.subscribeForeground(
      ref,
      _handleForegroundMessage,
      onDispose: () => _isDisposed = true,
    );

    return const SenderInitial();
  }

  @override
  bool get isLoading => state is SenderLoading || state is SenderCapturing;

  @override
  void setLoading() => state = const SenderLoading();

  @override
  void setError(String message) => state = SenderError(message);

  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    final data = message.data;

    if (data['kind'] != 'capture_request') return;
    if (!_isSenderTarget(data)) return;

    await _captureAndUpload();
  }

  bool _isSenderTarget(Map<String, dynamic> data) {
    final role = data['role']?.toString();
    final targetRole = data['targetRole']?.toString();

    return role == 'sender' || targetRole == 'sender';
  }

  Future<void> _captureAndUpload() async {
    if (_isHandlingCaptureRequest) return;

    if (!cameraController.isAttached) {
      dev.log(
        'capture_request ignored because no camera is attached',
        name: _logTag,
      );
      return;
    }

    _isHandlingCaptureRequest = true;
    _setState(const SenderCapturing());

    try {
      final image = await _takePictureWhenReady();

      if (image == null) {
        dev.log(
          'capture_request ignored because the camera is not ready',
          name: _logTag,
        );
        _setState(const SenderReady());
        return;
      }

      final response = await GrimEndpoints.import(
        image: await MultipartFile.fromFile(
          image.path,
          filename: _imageFilename(image),
        ),
      );

      if (response case ImportStreamSseError(:final value)) {
        throw StateError(value.error.message);
      }

      dev.log(
        'capture_request image uploaded from ${image.path}',
        name: _logTag,
      );
      _setState(const SenderReady());
    } catch (error, stackTrace) {
      dev.log(
        'capture_request failed',
        name: _logTag,
        error: error,
        stackTrace: stackTrace,
      );
      _setState(SenderError(error.toString()));
    } finally {
      _isHandlingCaptureRequest = false;
    }
  }

  Future<dynamic> _takePictureWhenReady() async {
    for (var attempt = 0; attempt < 20; attempt++) {
      if (cameraController.isReady) {
        return cameraController.takePicture();
      }

      await Future<void>.delayed(const Duration(milliseconds: 250));

      if (_isDisposed || !cameraController.isAttached) {
        return null;
      }
    }

    return cameraController.takePicture();
  }

  String _imageFilename(dynamic image) {
    final name = image.name.trim();
    if (name.isNotEmpty) return name;

    final pathParts = image.path.split(RegExp(r'[/\\]'));
    final pathFilename = pathParts.isEmpty ? '' : pathParts.last.trim();
    return pathFilename.isNotEmpty ? pathFilename : 'capture.jpg';
  }

  void _setState(SenderState nextState) {
    if (!_isDisposed) {
      state = nextState;
    }
  }
}

final senderControllerProvider =
    BaseNotifierProvider<SenderController, SenderState>(SenderController.new);
