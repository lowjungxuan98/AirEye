import '../json_map.dart';

class ExportListItem {
  const ExportListItem({required this.createdAt, this.updatedAt, this.finalText, this.imageUrl, this.errorMessage});

  final int createdAt;
  final int? updatedAt;
  final String? finalText;
  final String? imageUrl;
  final String? errorMessage;

  factory ExportListItem.fromJson(JsonMap json) => ExportListItem(
    createdAt: (json['createdAt'] as num).toInt(),
    updatedAt: (json['updatedAt'] as num?)?.toInt(),
    finalText: json['finalText'] as String?,
    imageUrl: json['imageUrl'] as String?,
    errorMessage: json['errorMessage'] as String?,
  );

  JsonMap toJson() => {
    'createdAt': createdAt,
    if (updatedAt != null) 'updatedAt': updatedAt,
    if (finalText != null) 'finalText': finalText,
    if (imageUrl != null) 'imageUrl': imageUrl,
    if (errorMessage != null) 'errorMessage': errorMessage,
  };
}
