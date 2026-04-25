import 'package:grim_core/grim_core.dart';

import '../domain/grim_export_page_result.dart';
import '../domain/grim_export_row.dart';

class GrimExportRemoteDataSource {
  GrimExportRemoteDataSource(this._apiClient);

  final GrimDioClient _apiClient;

  static const String _path = '/api/v1/export';

  Future<GrimExportPageResult> fetchPage({required int page, required int limit}) async {
    final response = await _apiClient.dio.get<Map<String, dynamic>>(
      _path,
      queryParameters: <String, dynamic>{'page': page, 'limit': limit},
    );
    final root = response.data;
    if (root == null) {
      throw StateError('export: empty response body');
    }
    return _parseExportPage(root);
  }
}

GrimExportPageResult _parseExportPage(Map<String, dynamic> json) {
  final rawList = json['data'];
  if (rawList is! List<dynamic>) {
    throw FormatException('export: expected data array');
  }
  final rows = rawList.map((e) {
    if (e is! Map<String, dynamic>) {
      throw FormatException('export: expected object in data[]');
    }
    return _parseRow(e);
  }).toList();

  final page = _asInt(json['page']);
  final limit = _asInt(json['limit']);
  final isNext = json['is_next'];
  if (isNext is! bool) {
    throw FormatException('export: expected is_next bool');
  }

  return GrimExportPageResult(data: rows, page: page, limit: limit, isNext: isNext);
}

GrimExportRow _parseRow(Map<String, dynamic> json) {
  final createdAt = _asInt(json['createdAt']);
  final updatedAt = _optionalInt(json['updatedAt']);
  final finalText = json['finalText'] as String?;
  final imageUrl = json['imageUrl'] as String?;
  final errorMessage = json['errorMessage'] as String?;

  return GrimExportRow(
    createdAt: createdAt,
    updatedAt: updatedAt,
    finalText: finalText,
    imageUrl: imageUrl,
    errorMessage: errorMessage,
  );
}

int _asInt(Object? value) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  throw FormatException('export: expected int, got $value');
}

int? _optionalInt(Object? value) {
  if (value == null) {
    return null;
  }
  return _asInt(value);
}
