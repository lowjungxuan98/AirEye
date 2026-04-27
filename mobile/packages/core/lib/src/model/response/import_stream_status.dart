import '../json_map.dart';
import 'import_stream_status_value.dart';

class ImportStreamStatus {
  const ImportStreamStatus({required this.status});
  final ImportStreamStatusValue status;

  factory ImportStreamStatus.fromJson(JsonMap json) =>
      ImportStreamStatus(status: ImportStreamStatusValue.fromJson(json['status'] as String));

  JsonMap toJson() => {'status': status.value};
}
