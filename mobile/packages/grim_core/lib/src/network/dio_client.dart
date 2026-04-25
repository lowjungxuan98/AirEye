import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'endpoints.dart';

class GrimDioClient {
  GrimDioClient({String baseUrl = GrimEndpoints.baseUrl, bool enableLogging = true})
    : dio = Dio(
        BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 30),
          sendTimeout: const Duration(seconds: 30),
          headers: const <String, Object>{'Accept': 'application/json'},
        ),
      ) {
    if (enableLogging) {
      dio.interceptors.add(
        LogInterceptor(requestBody: true, responseBody: true, logPrint: (message) => debugPrint(message.toString())),
      );
    }
  }

  final Dio dio;
}
