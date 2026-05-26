import '../json_map.dart';

class UpdateAutoAnalyseRequest {
  const UpdateAutoAnalyseRequest({required this.autoAnalyse});

  final bool autoAnalyse;

  JsonMap toJson() => {'auto_analyse': autoAnalyse};
}
