import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:grim_core/grim_core.dart';

void main() {
  group('GrimSseDecoder', () {
    test('decodes SSE data blocks separated by blank lines', () async {
      final stream = Stream<List<int>>.fromIterable([
        Uint8List.fromList(utf8.encode('data: {"status":"extracting_text"}\n\n')),
        Uint8List.fromList(utf8.encode('data: {"status":"analyzing_text"}\n\n')),
      ]);

      final events = await const GrimSseDecoder().decode(stream).toList();

      expect(events, <String>['{"status":"extracting_text"}', '{"status":"analyzing_text"}']);
    });

    test('joins multiple data lines into one payload', () async {
      final stream = Stream<List<int>>.fromIterable([
        Uint8List.fromList(utf8.encode('data: {"hello":"world"}\ndata: {"next":"line"}\n\n')),
      ]);

      final events = await const GrimSseDecoder().decode(stream).toList();

      expect(events, <String>['{"hello":"world"}\n{"next":"line"}']);
    });
  });

  group('GrimImportStreamEvent', () {
    test('parses status event payload', () {
      final event = GrimImportStreamEvent.fromJson(<String, dynamic>{'status': 'extracting_text'});

      expect(event, isA<GrimImportStatusEvent>());
      expect((event as GrimImportStatusEvent).status, GrimImportStatus.extractingText);
    });

    test('parses terminal success payload', () {
      final event = GrimImportStreamEvent.fromJson(<String, dynamic>{
        'id': 'upl_123',
        'createdAt': 1,
        'updatedAt': 2,
        'extractedText': 'extract',
        'finalText': 'final',
        'imageUrl': 'https://example.com/image.png',
        'cloudinaryPublicId': 'grim/upl_123',
      });

      expect(event, isA<GrimImportSuccessEvent>());
      expect((event as GrimImportSuccessEvent).id, 'upl_123');
    });

    test('parses terminal error payload', () {
      final event = GrimImportStreamEvent.fromJson(<String, dynamic>{
        'error': <String, dynamic>{'code': 'INTERNAL_ERROR', 'message': 'vision failed'},
      });

      expect(event, isA<GrimImportErrorEvent>());
      expect((event as GrimImportErrorEvent).code, 'INTERNAL_ERROR');
    });
  });
}
