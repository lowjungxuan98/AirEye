import '../json_map.dart';
import 'dependency_check.dart';

class IntegrationHealthReport {
  const IntegrationHealthReport({
    required this.version,
    required this.ok,
    required this.firebase,
    required this.llm,
    required this.s3,
  });

  final String version;
  final bool ok;
  final DependencyCheck firebase;
  final DependencyCheck llm;
  final DependencyCheck s3;

  factory IntegrationHealthReport.fromJson(JsonMap json) => IntegrationHealthReport(
    version: json['version'] as String,
    ok: json['ok'] as bool,
    firebase: DependencyCheck.fromJson(json['firebase'] as JsonMap),
    llm: DependencyCheck.fromJson(json['llm'] as JsonMap),
    s3: DependencyCheck.fromJson(json['s3'] as JsonMap),
  );

  JsonMap toJson() => {
    'version': version,
    'ok': ok,
    'firebase': firebase.toJson(),
    'llm': llm.toJson(),
    's3': s3.toJson(),
  };
}
