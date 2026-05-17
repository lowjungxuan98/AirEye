import '../json_map.dart';

class RegenerateRequest {
  const RegenerateRequest({
    required this.imageUrl,
    required this.text,
  });

  final String imageUrl;
  final String text;

  JsonMap toJson() => {
    'imageUrl': imageUrl,
    'text': text,
  };
}
