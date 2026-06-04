import 'package:core/src/model/model.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('QueuedWorkflowResponse', () {
    test('parses queued workflow JSON', () {
      final response = QueuedWorkflowResponse.fromJson({'status': 'queued', 'jobId': 'job_1', 'uploadId': 'upl_1'});

      expect(response.status, 'queued');
      expect(response.jobId, 'job_1');
      expect(response.uploadId, 'upl_1');
      expect(response.toJson(), {'status': 'queued', 'jobId': 'job_1', 'uploadId': 'upl_1'});
    });
  });
}
