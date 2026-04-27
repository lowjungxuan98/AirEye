import '../json_map.dart';
import 'export_list_item.dart';

class ExportListResponse {
  const ExportListResponse({required this.data, required this.page, required this.limit, required this.isNext});

  final List<ExportListItem> data;
  final int page;
  final int limit;
  final bool isNext;

  factory ExportListResponse.fromJson(JsonMap json) => ExportListResponse(
    data: (json['data'] as List<dynamic>).map((e) => ExportListItem.fromJson(e as JsonMap)).toList(growable: false),
    page: (json['page'] as num).toInt(),
    limit: (json['limit'] as num).toInt(),
    isNext: json['is_next'] as bool,
  );

  JsonMap toJson() => {
    'data': data.map((e) => e.toJson()).toList(growable: false),
    'page': page,
    'limit': limit,
    'is_next': isNext,
  };
}
