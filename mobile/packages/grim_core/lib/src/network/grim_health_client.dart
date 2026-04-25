import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'dio_client.dart';
import 'endpoints.dart';

class GrimHealthClient {
  GrimHealthClient({GrimDioClient? apiClient}) : _apiClient = apiClient ?? GrimDioClient();

  final GrimDioClient _apiClient;

  Future<GrimHealthReport> check() async {
    debugPrint('GRIM health check: ${GrimEndpoints.health}');
    final response = await _apiClient.dio
        .get<Map<String, dynamic>>(
          GrimEndpoints.health,
          options: Options(validateStatus: (status) => status != null && status < 600),
        )
        .timeout(const Duration(seconds: 15));
    debugPrint('GRIM health status: ${response.statusCode}');
    final root = response.data;
    if (root == null) {
      throw StateError('health: empty response body');
    }
    return GrimHealthReport.fromJson(root);
  }
}

class GrimHealthReport {
  const GrimHealthReport({
    required this.version,
    required this.ok,
    required this.firebase,
    required this.llm,
    required this.s3,
  });

  factory GrimHealthReport.fromJson(Map<String, dynamic> json) {
    return GrimHealthReport(
      version: _asString(json['version'], 'version'),
      ok: _asBool(json['ok'], 'ok'),
      firebase: GrimDependencyHealth.fromJson(_asMap(json['firebase'], 'firebase'), 'firebase'),
      llm: GrimDependencyHealth.fromJson(_asMap(json['llm'], 'llm'), 'llm'),
      s3: GrimDependencyHealth.fromJson(_asMap(json['s3'], 's3'), 's3'),
    );
  }

  final String version;
  final bool ok;
  final GrimDependencyHealth firebase;
  final GrimDependencyHealth llm;
  final GrimDependencyHealth s3;

  String get failureSummary {
    final failures = <String>[if (!firebase.ok) firebase.label, if (!llm.ok) llm.label, if (!s3.ok) s3.label];
    if (failures.isEmpty) {
      return 'Health check failed';
    }
    return 'Unavailable: ${failures.join(', ')}';
  }
}

class GrimDependencyHealth {
  const GrimDependencyHealth({required this.label, required this.ok, required this.latencyMs, this.error});

  factory GrimDependencyHealth.fromJson(Map<String, dynamic> json, String label) {
    return GrimDependencyHealth(
      label: label,
      ok: _asBool(json['ok'], '$label.ok'),
      latencyMs: _asInt(json['latencyMs'], '$label.latencyMs'),
      error: json['error'] as String?,
    );
  }

  final String label;
  final bool ok;
  final int latencyMs;
  final String? error;
}

bool _asBool(Object? value, String field) {
  if (value is bool) {
    return value;
  }
  throw FormatException('health: expected bool at $field, got $value');
}

int _asInt(Object? value, String field) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  throw FormatException('health: expected int at $field, got $value');
}

String _asString(Object? value, String field) {
  if (value is String) {
    return value;
  }
  throw FormatException('health: expected string at $field, got $value');
}

Map<String, dynamic> _asMap(Object? value, String field) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  throw FormatException('health: expected object at $field, got $value');
}
