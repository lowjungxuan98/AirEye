import 'dart:async';

import 'package:grim_core/grim_core.dart';

import '../domain/grim_sender_import_repository.dart';

enum GrimSenderCapturePhase { idle, capturing, importing, completed, failed }

class GrimSenderCaptureFlowState {
  const GrimSenderCaptureFlowState({required this.phase, this.message});

  const GrimSenderCaptureFlowState.idle() : this(phase: GrimSenderCapturePhase.idle);

  final GrimSenderCapturePhase phase;
  final String? message;
}

class GrimSenderCaptureFlowController {
  GrimSenderCaptureFlowController({required GrimFcmManager fcmManager, required GrimSenderImportRepository repository})
    : _fcmManager = fcmManager,
      _repository = repository;

  final GrimFcmManager _fcmManager;
  final GrimSenderImportRepository _repository;
  StreamSubscription<dynamic>? _subscription;
  bool _isHandlingCapture = false;

  void bind(
    GrimCameraPreviewController cameraController, {
    required void Function(GrimSenderCaptureFlowState state) onStateChanged,
  }) {
    _subscription?.cancel();
    _subscription = _fcmManager.onMessage.listen((message) {
      if (!_isCaptureRequest(message)) {
        return;
      }
      unawaited(_captureAndImport(cameraController, onStateChanged));
    });
  }

  void unbind() {
    final subscription = _subscription;
    _subscription = null;
    if (subscription != null) {
      unawaited(subscription.cancel());
    }
  }

  bool _isCaptureRequest(dynamic message) {
    final data = message.data;
    if (data is! Map) {
      return false;
    }
    return data['kind'] == 'capture_request' && (data['role'] == 'sender' || data['targetRole'] == 'sender');
  }

  Future<void> _captureAndImport(
    GrimCameraPreviewController cameraController,
    void Function(GrimSenderCaptureFlowState state) onStateChanged,
  ) async {
    if (_isHandlingCapture) {
      return;
    }

    _isHandlingCapture = true;
    try {
      onStateChanged(
        const GrimSenderCaptureFlowState(phase: GrimSenderCapturePhase.capturing, message: 'Capture request received'),
      );
      final imagePath = await cameraController.takePicturePath();

      onStateChanged(
        const GrimSenderCaptureFlowState(phase: GrimSenderCapturePhase.importing, message: 'Uploading capture'),
      );
      await _repository.importImage(imagePath);

      onStateChanged(
        const GrimSenderCaptureFlowState(phase: GrimSenderCapturePhase.completed, message: 'Capture uploaded'),
      );
    } catch (error) {
      onStateChanged(GrimSenderCaptureFlowState(phase: GrimSenderCapturePhase.failed, message: error.toString()));
    } finally {
      _isHandlingCapture = false;
    }
  }
}
