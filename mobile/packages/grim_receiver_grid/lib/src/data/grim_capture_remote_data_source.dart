import 'package:grim_core/grim_core.dart';

class GrimCaptureRemoteDataSource {
  GrimCaptureRemoteDataSource(this._apiClient);

  final GrimDioClient _apiClient;

  static const String _path = '/api/v1/capture';

  Future<void> requestCapture() async {
    final response = await _apiClient.dio.post<Map<String, dynamic>>(_path);
    final root = response.data;
    if (root == null) {
      throw StateError('capture: empty response body');
    }
    if (root['ok'] != true) {
      throw FormatException('capture: expected ok=true');
    }
  }
}
