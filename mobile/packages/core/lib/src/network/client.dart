import 'package:dio/dio.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';

import 'base_url.dart';
import '../env.dart';

class AirEyeClient {
  AirEyeClient._(this.dio);

  final Dio dio;

  Future<Response<T>> _request<T>(
    Future<Response<T>> Function() fn, {
    void Function(Response<T> response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
  }) async {
    try {
      final res = await fn();
      onSuccess?.call(res);
      return res;
    } catch (e, st) {
      onError?.call(e, st);
      rethrow;
    } finally {
      onFinally?.call();
    }
  }

  static Future<AirEyeClient> create({Map<String, dynamic>? defaultHeaders}) async {
    final baseUrl = await AirEyeBaseUrl.resolve();

    final dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        headers: <String, dynamic>{
          'accept': 'application/json',
          'x-api-key': Env.apiKey,
          ...?defaultHeaders,
        },
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 30),
        responseType: ResponseType.json,
      ),
    );

    dio.interceptors.add(PrettyDioLogger(requestHeader: true, requestBody: true, responseHeader: false, responseBody: true, error: true, compact: true, maxWidth: 120));

    return AirEyeClient._(dio);
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onReceiveProgress,
    void Function(Response<T> response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
  }) {
    return _request(
      () => dio.get<T>(path, queryParameters: queryParameters, options: options, cancelToken: cancelToken, onReceiveProgress: onReceiveProgress),
      onSuccess: onSuccess,
      onError: onError,
      onFinally: onFinally,
    );
  }

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
    void Function(Response<T> response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
  }) {
    return _request(
      () => dio.post<T>(path, data: data, queryParameters: queryParameters, options: options, cancelToken: cancelToken, onSendProgress: onSendProgress, onReceiveProgress: onReceiveProgress),
      onSuccess: onSuccess,
      onError: onError,
      onFinally: onFinally,
    );
  }

  Future<Response<T>> put<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
    void Function(Response<T> response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
  }) {
    return _request(
      () => dio.put<T>(path, data: data, queryParameters: queryParameters, options: options, cancelToken: cancelToken, onSendProgress: onSendProgress, onReceiveProgress: onReceiveProgress),
      onSuccess: onSuccess,
      onError: onError,
      onFinally: onFinally,
    );
  }
}
