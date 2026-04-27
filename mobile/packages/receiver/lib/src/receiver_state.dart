import 'package:core/core.dart';

sealed class ReceiverState extends BaseState {
  const ReceiverState();
}

class ReceiverInitial extends ReceiverState {
  const ReceiverInitial();
}

class ReceiverLoading extends ReceiverState {
  const ReceiverLoading();
}

class ReceiverReady extends ReceiverState {
  const ReceiverReady({
    required this.items,
    required this.page,
    required this.limit,
    required this.isNext,
    this.isRefreshing = false,
    this.isLoadingMore = false,
    this.isCapturing = false,
  });

  final List<ExportListItem> items;
  final int page;
  final int limit;
  final bool isNext;
  final bool isRefreshing;
  final bool isLoadingMore;
  final bool isCapturing;

  ReceiverReady copyWith({
    List<ExportListItem>? items,
    int? page,
    int? limit,
    bool? isNext,
    bool? isRefreshing,
    bool? isLoadingMore,
    bool? isCapturing,
  }) {
    return ReceiverReady(
      items: items ?? this.items,
      page: page ?? this.page,
      limit: limit ?? this.limit,
      isNext: isNext ?? this.isNext,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      isCapturing: isCapturing ?? this.isCapturing,
    );
  }
}

class ReceiverError extends ReceiverState {
  const ReceiverError(this.message);
  final String message;
}
