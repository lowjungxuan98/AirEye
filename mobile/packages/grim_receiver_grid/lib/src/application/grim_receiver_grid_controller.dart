import 'dart:async';

import 'package:grim_core/grim_core.dart';

import 'grim_receiver_grid_providers.dart';
import 'grim_receiver_grid_state.dart';

final grimReceiverGridControllerProvider =
    NotifierProvider.autoDispose<GrimReceiverGridController, GrimReceiverGridState>(GrimReceiverGridController.new);

class GrimReceiverGridController extends Notifier<GrimReceiverGridState> {
  StreamSubscription<dynamic>? _fcmSubscription;

  @override
  GrimReceiverGridState build() {
    final fcmManager = ref.watch(grimReceiverFcmManagerProvider);
    unawaited(_fcmSubscription?.cancel());
    _fcmSubscription = fcmManager.onMessage.listen((message) {
      if (!_isExportRefreshMessage(message)) {
        return;
      }
      unawaited(refreshExport());
    });

    ref.onDispose(() {
      final subscription = _fcmSubscription;
      _fcmSubscription = null;
      if (subscription != null) {
        unawaited(subscription.cancel());
      }
    });

    return const GrimReceiverGridState();
  }

  Future<GrimReceiverCaptureResult> requestCapture() async {
    if (state.isRequestingCapture) {
      return const GrimReceiverCaptureResult.success();
    }

    state = state.copyWith(isRequestingCapture: true);
    try {
      await ref.read(grimCaptureRepositoryProvider).requestCapture();
      return const GrimReceiverCaptureResult.success();
    } catch (error) {
      return GrimReceiverCaptureResult.failure(error.toString());
    } finally {
      if (ref.mounted) {
        state = state.copyWith(isRequestingCapture: false);
      }
    }
  }

  Future<void> refreshExport() async {
    ref.invalidate(grimReceiverExportPageProvider);
    await ref.read(grimReceiverExportPageProvider.future);
  }

  static bool _isExportRefreshMessage(dynamic message) {
    final data = message.data;
    if (data is! Map) {
      return false;
    }
    return data['kind'] == 'export_refresh' && (data['role'] == 'receiver' || data['targetRole'] == 'receiver');
  }
}
