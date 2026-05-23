import '../json_map.dart';

class SendNotificationResponse {
  const SendNotificationResponse({required this.ok});
  final bool ok;

  factory SendNotificationResponse.fromJson(JsonMap json) => SendNotificationResponse(ok: json['ok'] as bool);
  JsonMap toJson() => {'ok': ok};
}
