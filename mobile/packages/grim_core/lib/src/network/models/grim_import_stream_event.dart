enum GrimImportStatus {
  extractingText('extracting_text'),
  analyzingText('analyzing_text'),
  formatGuard('format_guard');

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

    final data = json['data'];
    if (data is Map<String, dynamic>) {
      return GrimImportDataEvent(Map<String, dynamic>.unmodifiable(data));
    }

    return GrimImportSuccessEvent(
      id: _readRequiredString(json, 'id'),
      createdAt: _readRequiredInt(json, 'createdAt'),
      updatedAt: _readRequiredInt(json, 'updatedAt'),
      extractedText: _readOptionalString(json, 'extractedText'),
      finalText: _readOptionalString(json, 'finalText'),
      imageUrl: _readOptionalString(json, 'imageUrl'),
      bucket: _readOptionalString(json, 'bucket'),
      objectKey: _readOptionalString(json, 'objectKey'),
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
}

class GrimImportDataEvent extends GrimImportStreamEvent {
  const GrimImportDataEvent(this.data);

  final Map<String, dynamic> data;
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

String? _readOptionalString(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value == null) {
    return null;
  }
  if (value is String) {
    return value;
  }

  throw FormatException('Invalid "$key" in import stream payload.');
}

int _readRequiredInt(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is int) {
    return value;
  }

  throw FormatException('Missing or invalid "$key" in import stream payload.');
}
