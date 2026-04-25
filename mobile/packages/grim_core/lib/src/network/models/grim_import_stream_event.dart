enum GrimImportStatus {
  extractingText('extracting_text'),
  analyzingText('analyzing_text');

  const GrimImportStatus(this.wireValue);

  final String wireValue;

  static GrimImportStatus fromWireValue(String value) {
    return GrimImportStatus.values.firstWhere(
      (status) => status.wireValue == value,
      orElse: () => throw FormatException('Unknown import status: $value'),
    );
  }
}

sealed class GrimImportStreamEvent {
  const GrimImportStreamEvent();

  factory GrimImportStreamEvent.fromJson(Map<String, dynamic> json) {
    final status = json['status'];
    if (status is String) {
      return GrimImportStatusEvent(GrimImportStatus.fromWireValue(status));
    }

    final error = json['error'];
    if (error is Map<String, dynamic>) {
      return GrimImportErrorEvent(
        code: _readRequiredString(error, 'code'),
        message: _readRequiredString(error, 'message'),
      );
    }

    return GrimImportSuccessEvent(
      id: _readRequiredString(json, 'id'),
      createdAt: _readRequiredInt(json, 'createdAt'),
      updatedAt: _readRequiredInt(json, 'updatedAt'),
      extractedText: _readRequiredString(json, 'extractedText'),
      finalText: _readRequiredString(json, 'finalText'),
      imageUrl: _readRequiredString(json, 'imageUrl'),
      cloudinaryPublicId: _readRequiredString(json, 'cloudinaryPublicId'),
    );
  }
}

class GrimImportStatusEvent extends GrimImportStreamEvent {
  const GrimImportStatusEvent(this.status);

  final GrimImportStatus status;
}

class GrimImportSuccessEvent extends GrimImportStreamEvent {
  const GrimImportSuccessEvent({
    required this.id,
    required this.createdAt,
    required this.updatedAt,
    required this.extractedText,
    required this.finalText,
    required this.imageUrl,
    required this.cloudinaryPublicId,
  });

  final String id;
  final int createdAt;
  final int updatedAt;
  final String extractedText;
  final String finalText;
  final String imageUrl;
  final String cloudinaryPublicId;
}

class GrimImportErrorEvent extends GrimImportStreamEvent {
  const GrimImportErrorEvent({required this.code, required this.message});

  final String code;
  final String message;
}

String _readRequiredString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is String && value.isNotEmpty) {
    return value;
  }

  throw FormatException('Missing or invalid "$key" in import stream payload.');
}

int _readRequiredInt(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int) {
    return value;
  }

  throw FormatException('Missing or invalid "$key" in import stream payload.');
}
