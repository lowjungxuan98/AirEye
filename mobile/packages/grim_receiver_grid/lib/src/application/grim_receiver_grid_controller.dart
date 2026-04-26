import 'dart:async';

import 'package:grim_core/grim_core.dart';

import '../domain/grim_export_row.dart';
import 'grim_receiver_grid_providers.dart';
import 'grim_receiver_grid_state.dart';

final grimReceiverGridControllerProvider =
    NotifierProvider.autoDispose<GrimReceiverGridController, GrimReceiverGridState>(GrimReceiverGridController.new);

class GrimReceiverGridController extends Notifier<GrimReceiverGridState> {
  StreamSubscription<dynamic>? _fcmSubscription;

  @override
  GrimReceiverGridState build() {
    final fcmManager = ref.watch(grimReceiverFcmManagerProvider);
    unawaited(_loadOpenedImageKeys());
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

  Future<void> _loadOpenedImageKeys() async {
    try {
      final openedImageKeys = await ref.read(grimOpenedImageStoreProvider).loadOpenedImageKeys();
      if (ref.mounted) {
        state = state.copyWith(hasLoadedOpenedImageKeys: true, openedImageKeys: openedImageKeys);
      }
    } catch (_) {
      if (ref.mounted) {
        state = state.copyWith(hasLoadedOpenedImageKeys: true);
      }
    }
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

  Future<void> markImageOpened(GrimExportRow row) async {
    final imageKey = row.openedImageKey;
    if (imageKey == null || state.openedImageKeys.contains(imageKey)) {
      return;
    }

    final openedImageKeys = {...state.openedImageKeys, imageKey};
    state = state.copyWith(openedImageKeys: openedImageKeys);
    try {
      await ref.read(grimOpenedImageStoreProvider).markImageOpened(imageKey);
    } catch (_) {}
  }

  static bool _isExportRefreshMessage(dynamic message) {
    final data = message.data;
    if (data is! Map) {
      return false;
    }
    return data['kind'] == 'export_refresh' && (data['role'] == 'receiver' || data['targetRole'] == 'receiver');
  }
}
