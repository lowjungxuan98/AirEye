/// One row from `GET /api/v1/export` (`ExportListItem` in OpenAPI).
class GrimExportRow {
  const GrimExportRow({required this.createdAt, this.updatedAt, this.finalText, this.imageUrl, this.errorMessage});

  final int createdAt;
  final int? updatedAt;
  final String? finalText;
  final String? imageUrl;
  final String? errorMessage;

  bool get hasImage => imageUrl != null && imageUrl!.isNotEmpty;
  bool get hasError => errorMessage != null && errorMessage!.isNotEmpty;
  String? get openedImageKey => hasImage ? '$createdAt' : null;
}
