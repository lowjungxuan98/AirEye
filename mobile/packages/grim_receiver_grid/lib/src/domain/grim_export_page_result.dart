import 'grim_export_row.dart';

/// Paginated body from `GET /api/v1/export` (`ExportListResponse` in OpenAPI).
class GrimExportPageResult {
  const GrimExportPageResult({required this.data, required this.page, required this.limit, required this.isNext});

  final List<GrimExportRow> data;
  final int page;
  final int limit;
  final bool isNext;
}
