import 'dart:convert';

import 'package:dio/dio.dart';

import '../model/model.dart';
import 'base_url.dart';
import 'client.dart';

class GrimEndpoints {
  static const String _healthPath = '/api/v1/health';
  static const String _importPath = '/api/v1/import';
  static const String _capturePath = '/api/v1/capture';
  static const String _exportPath = '/api/v1/export';

  static Future<String> _url(String pathAndQuery) {
    return GrimBaseUrl.resolve().then((base) => '$base$pathAndQuery');
  }

  static Future<IntegrationHealthReport> health({
    void Function(IntegrationHealthReport response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
  }) async {
    final client = await GrimClient.create();
    final url = await _url(_healthPath);

    final res = await client.get<JsonMap>(url, onError: onError, onFinally: onFinally);

    final model = IntegrationHealthReport.fromJson(res.data ?? const <String, dynamic>{});
    onSuccess?.call(model);
    return model;
  }

  static Future<ExportListResponse> export({
    int page = 1,
    int limit = 20,
    void Function(ExportListResponse response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
  }) async {
    final qp = <String>['page=$page', 'limit=$limit'];
    final client = await GrimClient.create();
    final url = await _url('$_exportPath?${qp.join('&')}');

    final res = await client.get<JsonMap>(url, onError: onError, onFinally: onFinally);

    final model = ExportListResponse.fromJson(res.data ?? const <String, dynamic>{});
    onSuccess?.call(model);
    return model;
  }

  static Future<CaptureResponse> capture({
    void Function(CaptureResponse response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
  }) async {
    final client = await GrimClient.create();
    final url = await _url(_capturePath);

    final res = await client.post<JsonMap>(url, onError: onError, onFinally: onFinally);

    final model = CaptureResponse.fromJson(res.data ?? const <String, dynamic>{});
    onSuccess?.call(model);
    return model;
  }

  static Future<ImportStreamSseData> import({
    required MultipartFile image,
    void Function(ImportStreamSseData response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
    CancelToken? cancelToken,
    Options? options,
  }) async {
    final client = await GrimClient.create();
    final url = await _url(_importPath);

    final formData = FormData.fromMap({'image': image});

    final res = await client.post<String>(
      url,
      data: formData,
      options: (options ?? Options()).copyWith(responseType: ResponseType.plain),
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
      onError: onError,
      onFinally: onFinally,
    );

    final payload = _lastSseDataPayload(res.data ?? '');
    final model = ImportStreamSseData.fromJson(jsonDecode(payload) as JsonMap);
    onSuccess?.call(model);
    return model;
  }

  static String _lastSseDataPayload(String body) {
    // SSE format: blocks separated by blank line; each block can have `data: ...`.
    // We take the last `data:` line we can find.
    final lines = body.split('\n');
    for (var i = lines.length - 1; i >= 0; i--) {
      final line = lines[i].trimRight();
      if (line.startsWith('data:')) {
        return line.substring('data:'.length).trim();
      }
    }
    throw StateError('No SSE data line found in import response.');
  }
}
