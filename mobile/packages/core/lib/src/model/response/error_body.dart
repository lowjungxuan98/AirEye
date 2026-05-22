import '../json_map.dart';
import 'error_body_error.dart';

class ErrorBody {
  const ErrorBody({required this.error});
  final ErrorBodyError error;

  factory ErrorBody.fromJson(JsonMap json) => ErrorBody(error: ErrorBodyError.fromJson(json['error'] as JsonMap));

  JsonMap toJson() => {'error': error.toJson()};
}
