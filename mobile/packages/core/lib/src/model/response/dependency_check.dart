import '../json_map.dart';

class DependencyCheck {
  const DependencyCheck({required this.ok, required this.latencyMs, this.error});

  final bool ok;
  final int latencyMs;
  final String? error;

  factory DependencyCheck.fromJson(JsonMap json) => DependencyCheck(
    ok: json['ok'] as bool,
    latencyMs: (json['latencyMs'] as num).toInt(),
    error: json['error'] as String?,
  );

  JsonMap toJson() => {'ok': ok, 'latencyMs': latencyMs, if (error != null) 'error': error};
}
