import '../json_map.dart';

class AutoAnalyseResponse {
  const AutoAnalyseResponse({required this.autoAnalyse});

  final bool autoAnalyse;

  factory AutoAnalyseResponse.fromJson(JsonMap json) => AutoAnalyseResponse(autoAnalyse: json['auto_analyse'] as bool);

  JsonMap toJson() => {'auto_analyse': autoAnalyse};
}
