import '../json_map.dart';

class UpdateAiRequest {
  const UpdateAiRequest({required this.ai});

  final bool ai;

  JsonMap toJson() => {'ai': ai};
}
