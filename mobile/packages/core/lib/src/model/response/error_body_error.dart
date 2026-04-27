import '../json_map.dart';

class ErrorBodyError {
  const ErrorBodyError({required this.code, required this.message});

  final String code;
  final String message;

  factory ErrorBodyError.fromJson(JsonMap json) =>
      ErrorBodyError(code: json['code'] as String, message: json['message'] as String);

  JsonMap toJson() => {'code': code, 'message': message};
}
