import '../json_map.dart';

class CaptureResponse {
  const CaptureResponse({required this.ok});
  final bool ok;

  factory CaptureResponse.fromJson(JsonMap json) => CaptureResponse(ok: json['ok'] as bool);
  JsonMap toJson() => {'ok': ok};
}
