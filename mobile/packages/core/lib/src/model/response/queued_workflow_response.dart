import '../json_map.dart';

class QueuedWorkflowResponse {
  const QueuedWorkflowResponse({required this.status, required this.jobId, required this.uploadId});

  final String status;
  final String jobId;
  final String uploadId;

  factory QueuedWorkflowResponse.fromJson(JsonMap json) => QueuedWorkflowResponse(status: json['status'] as String, jobId: json['jobId'] as String, uploadId: json['uploadId'] as String);

  JsonMap toJson() => {'status': status, 'jobId': jobId, 'uploadId': uploadId};
}
