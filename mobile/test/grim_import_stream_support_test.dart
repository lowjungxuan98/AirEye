import 'dart:convert';

import 'package:flutter/foundation.dart';
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

    test('parses format guard status event payload', () {
      final event = GrimImportStreamEvent.fromJson(<String, dynamic>{'status': 'format_guard'});

      expect(event, isA<GrimImportStatusEvent>());
      expect((event as GrimImportStatusEvent).status, GrimImportStatus.formatGuard);
    });

    test('parses intermediate data payload', () {
      final event = GrimImportStreamEvent.fromJson(<String, dynamic>{
        'data': <String, dynamic>{'guardedFinalText': 'guarded'},
      });

      expect(event, isA<GrimImportDataEvent>());
      expect((event as GrimImportDataEvent).data, <String, dynamic>{'guardedFinalText': 'guarded'});
    });

    test('parses terminal success payload', () {
      final event = GrimImportStreamEvent.fromJson(<String, dynamic>{
        'id': 'upl_123',
        'createdAt': 1,
        'updatedAt': 2,
        'extractedText': 'extract',
        'finalText': 'final',
        'imageUrl': 'https://example.com/image.png',
        'bucket': 'grim-development',
        'objectKey': 'uploads/upl_123.png',
      });

      expect(event, isA<GrimImportSuccessEvent>());
      final success = event as GrimImportSuccessEvent;
      expect(success.id, 'upl_123');
      expect(success.bucket, 'grim-development');
      expect(success.objectKey, 'uploads/upl_123.png');
    });

    test('parses terminal error payload', () {
      final event = GrimImportStreamEvent.fromJson(<String, dynamic>{
        'error': <String, dynamic>{'code': 'INTERNAL_ERROR', 'message': 'vision failed'},
      });

      expect(event, isA<GrimImportErrorEvent>());
      expect((event as GrimImportErrorEvent).code, 'INTERNAL_ERROR');
    });
  });

  group('GrimHealthReport', () {
    test('parses backend health payload', () {
      final report = GrimHealthReport.fromJson(<String, dynamic>{
        'version': '0.1.8',
        'ok': true,
        'firebase': <String, dynamic>{'ok': true, 'latencyMs': 1},
        'llm': <String, dynamic>{'ok': true, 'latencyMs': 2},
        's3': <String, dynamic>{'ok': true, 'latencyMs': 3},
      });

      expect(report.version, '0.1.8');
      expect(report.ok, isTrue);
      expect(report.llm.ok, isTrue);
      expect(report.s3.latencyMs, 3);
    });

    test('summarizes unhealthy dependencies', () {
      final report = GrimHealthReport.fromJson(<String, dynamic>{
        'version': '0.1.8',
        'ok': false,
        'firebase': <String, dynamic>{'ok': true, 'latencyMs': 1},
        'llm': <String, dynamic>{'ok': false, 'latencyMs': 2, 'error': 'HTTP 401'},
        's3': <String, dynamic>{'ok': false, 'latencyMs': 3, 'error': 'bucket unavailable'},
      });

      expect(report.failureSummary, 'Unavailable: llm, s3');
    });
  });

  group('GrimEndpoints', () {
    test('resolves Android emulator debug origin', () {
      expect(
        GrimEndpoints.debugOriginFor(platform: TargetPlatform.android, isPhysicalDevice: false),
        'http://10.0.2.2:3001',
      );
    });

    test('resolves iOS simulator debug origin', () {
      expect(
        GrimEndpoints.debugOriginFor(platform: TargetPlatform.iOS, isPhysicalDevice: false),
        'http://localhost:3001',
      );
    });

    test('resolves physical-device debug origin to the Mac LAN address', () {
      expect(
        GrimEndpoints.debugOriginFor(platform: TargetPlatform.android, isPhysicalDevice: true),
        'http://192.168.68.57:3001',
      );
      expect(
        GrimEndpoints.debugOriginFor(platform: TargetPlatform.iOS, isPhysicalDevice: true),
        'http://192.168.68.57:3001',
      );
    });

    test('derives debug health from the API prefix', () {
      expect(GrimEndpoints.health, 'http://192.168.68.57:3001/api/v1/health');
    });
  });
}
