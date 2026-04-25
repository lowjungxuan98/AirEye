import 'package:grim_core/grim_core.dart';

import '../domain/grim_sender_import_repository.dart';

class GrimSenderImportRepositoryImpl implements GrimSenderImportRepository {
  GrimSenderImportRepositoryImpl(this._client);

  final GrimImportStreamClient _client;

  @override
  Future<void> importImage(String imagePath) async {
    await for (final event in _client.streamImportFile(imagePath: imagePath)) {
      switch (event) {
        case GrimImportErrorEvent(:final code, :final message):
          throw GrimSenderImportException(code: code, message: message);
        case GrimImportSuccessEvent():
          return;
        case GrimImportStatusEvent():
          break;
      }
    }

    throw const GrimSenderImportException(code: 'IMPORT_EMPTY_STREAM', message: 'Import completed without a result.');
  }
}

class GrimSenderImportException implements Exception {
  const GrimSenderImportException({required this.code, required this.message});

  final String code;
  final String message;

  @override
  String toString() => '$code: $message';
}
