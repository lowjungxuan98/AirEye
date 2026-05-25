import '../json_map.dart';

class AiResponse {
  const AiResponse({required this.ai});

  final bool ai;

  factory AiResponse.fromJson(JsonMap json) => AiResponse(ai: json['ai'] as bool);

  JsonMap toJson() => {'ai': ai};
}
