import '../json_map.dart';

class ImportStreamResult {
  const ImportStreamResult({
    required this.id,
    required this.createdAt,
    required this.updatedAt,
    this.extractedText,
    this.finalText,
    this.imageUrl,
    this.bucket,
    this.objectKey,
  });

  final String id;
  final int createdAt;
  final int updatedAt;
  final String? extractedText;
  final String? finalText;
  final String? imageUrl;
  final String? bucket;
  final String? objectKey;

  factory ImportStreamResult.fromJson(JsonMap json) => ImportStreamResult(
    id: json['id'] as String,
    createdAt: (json['createdAt'] as num).toInt(),
    updatedAt: (json['updatedAt'] as num).toInt(),
    extractedText: json['extractedText'] as String?,
    finalText: json['finalText'] as String?,
    imageUrl: json['imageUrl'] as String?,
    bucket: json['bucket'] as String?,
    objectKey: json['objectKey'] as String?,
  );

  JsonMap toJson() => {
    'id': id,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
    if (extractedText != null) 'extractedText': extractedText,
    if (finalText != null) 'finalText': finalText,
    if (imageUrl != null) 'imageUrl': imageUrl,
    if (bucket != null) 'bucket': bucket,
    if (objectKey != null) 'objectKey': objectKey,
  };
}
