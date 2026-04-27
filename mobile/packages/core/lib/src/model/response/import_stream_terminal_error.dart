import '../json_map.dart';
import 'error_body_error.dart';

class ImportStreamTerminalError {
  const ImportStreamTerminalError({required this.error});
  final ErrorBodyError error;

  factory ImportStreamTerminalError.fromJson(JsonMap json) =>
      ImportStreamTerminalError(error: ErrorBodyError.fromJson(json['error'] as JsonMap));

  JsonMap toJson() => {'error': error.toJson()};
}
