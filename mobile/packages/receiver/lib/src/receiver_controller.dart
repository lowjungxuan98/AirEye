import 'package:core/core.dart';
import 'receiver_state.dart';

class ReceiverController extends BaseController<ReceiverState> {
  @override
  ReceiverState build() {
    GrimFcmManager.subscribeForeground(
      ref,
      _handleForegroundMessage,
      onDispose: () => _isDisposed = true,
    );

    return const ReceiverInitial();
  }

  var _isDisposed = false;
  var _isNotificationRefreshRunning = false;
  var _hasPendingNotificationRefresh = false;

  @override
  bool get isLoading => state is ReceiverLoading;

  @override
  void setLoading() => state = const ReceiverLoading();

  @override
  void setError(String message) => state = ReceiverError(message);

  static const int _defaultLimit = 50;

  ReceiverReady _readyFromExport(ExportListResponse data) => ReceiverReady(
    items: data.data,
    page: data.page,
    limit: data.limit,
    isNext: data.isNext,
  );

  Future<void> loadFirstPage({int limit = _defaultLimit}) => run(() async {
    final data = await GrimEndpoints.export(page: 1, limit: limit);
    state = _readyFromExport(data);
  });

  Future<void> refresh() async {
    final current = state;
    if (current is ReceiverReady) {
      state = current.copyWith(isRefreshing: true);
    } else {
      state = const ReceiverLoading();
    }

    try {
      final data = await GrimEndpoints.export(page: 1, limit: _defaultLimit);
      state = _readyFromExport(data);
    } catch (e) {
      state = ReceiverError(e.toString());
    }
  }

  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    final data = message.data;

    if (data['kind'] != 'export_refresh') return;
    if (!_isReceiverTarget(data)) return;

    await _refreshFromNotification();
  }

  bool _isReceiverTarget(Map<String, dynamic> data) {
    final role = data['role']?.toString();
    final targetRole = data['targetRole']?.toString();

    return role == 'receiver' || targetRole == 'receiver';
  }

  Future<void> _refreshFromNotification() async {
    if (_isNotificationRefreshRunning) {
      _hasPendingNotificationRefresh = true;
      return;
    }

    _isNotificationRefreshRunning = true;

    try {
      do {
        _hasPendingNotificationRefresh = false;
        await refresh();
      } while (_hasPendingNotificationRefresh && !_isDisposed);
    } finally {
      _isNotificationRefreshRunning = false;
    }
  }

  Future<void> capture() async {
    final current = state;
    if (current is! ReceiverReady) return;
    if (current.isCapturing) return;

    state = current.copyWith(isCapturing: true);

    try {
      await GrimEndpoints.capture();
    } catch (_) {
      // Keep UI state; capture errors can be surfaced later if needed.
    } finally {
      final latest = state;
      if (latest is ReceiverReady) {
        state = latest.copyWith(isCapturing: false);
      }
    }
  }

  Future<void> loadNextPage() async {
    final current = state;
    if (current is! ReceiverReady) return;
    if (!current.isNext) return;
    if (current.isLoadingMore || current.isRefreshing) return;

    state = current.copyWith(isLoadingMore: true);

    try {
      final nextPage = current.page + 1;
      final data = await GrimEndpoints.export(
        page: nextPage,
        limit: current.limit,
      );

      state = current.copyWith(
        items: [...current.items, ...data.data],
        page: data.page,
        limit: data.limit,
        isNext: data.isNext,
        isLoadingMore: false,
      );
    } catch (_) {
      // Keep existing list; just stop the spinner.
      state = current.copyWith(isLoadingMore: false);
    }
  }
}

final receiverControllerProvider =
    BaseNotifierProvider<ReceiverController, ReceiverState>(
      ReceiverController.new,
    );
