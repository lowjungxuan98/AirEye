import 'dart:convert';

import 'package:dio/dio.dart';

import 'dio_client.dart';
import 'endpoints.dart';
import 'grim_sse_decoder.dart';
import 'models/grim_import_stream_event.dart';

class GrimImportHttpException implements Exception {
  const GrimImportHttpException({required this.statusCode, required this.code, required this.message, this.body});

  final int statusCode;
  final String code;
  final String message;
  final String? body;

  @override
  String toString() {
    return 'GrimImportHttpException('
        'statusCode: $statusCode, '
        'code: $code, '
        'message: $message'
        ')';
  }
}

class GrimImportStreamClient {
  GrimImportStreamClient({Dio? dio, GrimSseDecoder? sseDecoder})
    : _dio = dio ?? GrimDioClient().dio,
      _sseDecoder = sseDecoder ?? const GrimSseDecoder();

  final Dio _dio;
  final GrimSseDecoder _sseDecoder;

  Stream<GrimImportStreamEvent> streamImportFile({
    required String imagePath,
    String? filename,
    CancelToken? cancelToken,
  }) async* {
    final response = await _dio.post<ResponseBody>(
      GrimEndpoints.import,
      data: FormData.fromMap({
        'image': await MultipartFile.fromFile(imagePath, filename: filename ?? _fileNameFromPath(imagePath)),
      }),
      cancelToken: cancelToken,
      options: Options(
        responseType: ResponseType.stream,
        headers: const <String, Object>{Headers.acceptHeader: 'text/event-stream, application/json'},
        validateStatus: (_) => true,
        sendTimeout: const Duration(minutes: 2),
        receiveTimeout: const Duration(minutes: 5),
      ),
    );

    final responseBody = response.data;
    if (responseBody == null) {
      throw const FormatException('Import response body was empty.');
    }

    final statusCode = response.statusCode ?? 0;
    if (statusCode != 200) {
      throw await _toHttpException(statusCode, responseBody);
    }

    final contentType = response.headers.value(Headers.contentTypeHeader) ?? '';
    if (!contentType.contains('text/event-stream')) {
      throw await _toHttpException(
        statusCode,
        responseBody,
        fallbackMessage: 'Expected text/event-stream but got "$contentType".',
      );
    }

    await for (final payload in _sseDecoder.decode(responseBody.stream.cast<List<int>>())) {
      final decoded = jsonDecode(payload);
      if (decoded is! Map<String, dynamic>) {
        throw FormatException('Unexpected SSE payload: $payload');
      }

      yield GrimImportStreamEvent.fromJson(decoded);
    }
  }

  Future<GrimImportHttpException> _toHttpException(
    int statusCode,
    ResponseBody responseBody, {
    String? fallbackMessage,
  }) async {
    final body = await responseBody.stream.cast<List<int>>().transform(utf8.decoder).join();

    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) {
        final error = decoded['error'];
        if (error is Map<String, dynamic>) {
          return GrimImportHttpException(
            statusCode: statusCode,
            code: _asString(error['code']) ?? 'HTTP_ERROR',
            message: _asString(error['message']) ?? fallbackMessage ?? 'Import request failed.',
            body: body,
          );
        }
      }
    } catch (_) {
      // Fall back to a generic HTTP error when the body is not JSON.
    }

    return GrimImportHttpException(
      statusCode: statusCode,
      code: 'HTTP_ERROR',
      message: fallbackMessage ?? 'Import request failed.',
      body: body.isEmpty ? null : body,
    );
  }

  String _fileNameFromPath(String imagePath) {
    final segments = imagePath.split(RegExp(r'[\\/]'));
    return segments.isNotEmpty ? segments.last : imagePath;
  }
}

String? _asString(Object? value) => value is String ? value : null;
