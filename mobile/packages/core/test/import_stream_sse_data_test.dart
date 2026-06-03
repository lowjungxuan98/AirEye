import 'package:flutter_test/flutter_test.dart';
import 'package:core/src/model/model.dart';

void main() {
  group('ImportStreamSseData', () {
    test('parses queued status events', () {
      final event = ImportStreamSseData.fromJson({
        'status': 'queued',
        'data': {'position': 1},
      });

      expect(event, isA<ImportStreamSseStatus>());
      expect((event as ImportStreamSseStatus).value.status, ImportStreamStatusValue.queued);
    });

    test('parses running_step status events', () {
      final event = ImportStreamSseData.fromJson({
        'status': 'running_step',
        'data': {'index': 0, 'prompt': 'extract', 'model': 'image'},
      });

      expect(event, isA<ImportStreamSseStatus>());
      expect((event as ImportStreamSseStatus).value.status, ImportStreamStatusValue.runningStep);
    });
  });
}
