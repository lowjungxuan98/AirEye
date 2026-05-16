import 'package:core/core.dart';
import 'image_detail_state.dart';

class ImageDetailController extends BaseController<ImageDetailState> {
  var _isDisposed = false;
  ExportListItem? _refItem;

  @override
  ImageDetailState build() {
    GrimFcmManager.subscribeExportRefresh(
      ref,
      _refresh,
      onDispose: () => _isDisposed = true,
    );
    return const ImageDetailInitial();
  }

  @override
  bool get isLoading => state is ImageDetailLoading;

  @override
  void setLoading() => state = const ImageDetailLoading();

  @override
  void setError(String message) => state = ImageDetailError(message);

  void init(ExportListItem item) {
    final current = state;
    if (current is ImageDetailReady && current.item.createdAt == item.createdAt) return;
    _refItem = item;
    state = ImageDetailReady(item);
  }

  Future<void> _refresh() async {
    final refItem = _refItem;
    if (refItem == null || _isDisposed) return;

    try {
      final response = await GrimEndpoints.export(page: 1, limit: 50);
      final updated = response.data.firstWhere(
        (i) => i.createdAt == refItem.createdAt,
        orElse: () => refItem,
      );
      if (!_isDisposed) state = ImageDetailReady(updated);
    } catch (_) {}
  }
}

final imageDetailControllerProvider =
    NotifierProvider.autoDispose<ImageDetailController, ImageDetailState>(
      ImageDetailController.new,
    );
