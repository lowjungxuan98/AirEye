import 'package:dio/dio.dart';

import '../model/model.dart';
import 'base_url.dart';
import 'client.dart';

class AirEyeEndpoints {
  static const String _healthPath = '/api/v1/health';
  static const String _importPath = '/api/v1/import';
  static const String _regeneratePath = '/api/v1/regenerate';
  static const String _sendNotificationPath = '/api/v1/send-notification';
  static const String _exportPath = '/api/v1/export';
  static const String _providerPath = '/api/v1/provider';
  static const String _autoAnalysePath = '/api/v1/auto-analyse';

  static Future<String> _url(String pathAndQuery) {
    return AirEyeBaseUrl.resolve().then((base) => '$base$pathAndQuery');
  }

  static Future<IntegrationHealthReport> health({
    void Function(IntegrationHealthReport response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
  }) async {
    final client = await AirEyeClient.create();
    final url = await _url(_healthPath);

    final res = await client.get<JsonMap>(url, onError: onError, onFinally: onFinally);

    final model = IntegrationHealthReport.fromJson(res.data ?? const <String, dynamic>{});
    onSuccess?.call(model);
    return model;
  }

  static Future<ExportListResponse> export({
    int page = 1,
    int limit = 20,
    void Function(ExportListResponse response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
  }) async {
    final qp = <String>['page=$page', 'limit=$limit'];
    final client = await AirEyeClient.create();
    final url = await _url('$_exportPath?${qp.join('&')}');

    final res = await client.get<JsonMap>(url, onError: onError, onFinally: onFinally);

    final model = ExportListResponse.fromJson(res.data ?? const <String, dynamic>{});
    onSuccess?.call(model);
    return model;
  }

  static Future<SendNotificationResponse> sendNotification({
    void Function(SendNotificationResponse response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
  }) async {
    final client = await AirEyeClient.create();
    final url = await _url(_sendNotificationPath);

    final res = await client.post<JsonMap>(url, onError: onError, onFinally: onFinally);

    final model = SendNotificationResponse.fromJson(res.data ?? const <String, dynamic>{});
    onSuccess?.call(model);
    return model;
  }

  static Future<QueuedWorkflowResponse> import({
    required MultipartFile image,
    void Function(QueuedWorkflowResponse response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
    ProgressCallback? onSendProgress,
    CancelToken? cancelToken,
    Options? options,
  }) async {
    final client = await AirEyeClient.create();
    final url = await _url(_importPath);

    final formData = FormData.fromMap({'image': image});

    final res = await client.post<JsonMap>(url, data: formData, options: options, cancelToken: cancelToken, onSendProgress: onSendProgress, onError: onError, onFinally: onFinally);

    final model = QueuedWorkflowResponse.fromJson(res.data ?? const <String, dynamic>{});
    onSuccess?.call(model);
    return model;
  }

  static Future<QueuedWorkflowResponse> regenerate({
    required RegenerateRequest request,
    void Function(QueuedWorkflowResponse response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
    CancelToken? cancelToken,
    Options? options,
  }) async {
    final client = await AirEyeClient.create();
    final url = await _url(_regeneratePath);

    final res = await client.post<JsonMap>(url, data: request.toJson(), options: options, cancelToken: cancelToken, onError: onError, onFinally: onFinally);

    final model = QueuedWorkflowResponse.fromJson(res.data ?? const <String, dynamic>{});
    onSuccess?.call(model);
    return model;
  }

  static Future<ProviderResponse> getProvider({void Function(ProviderResponse response)? onSuccess, void Function(Object error, StackTrace stackTrace)? onError, void Function()? onFinally}) async {
    final client = await AirEyeClient.create();
    final url = await _url(_providerPath);

    final res = await client.get<JsonMap>(url, onError: onError, onFinally: onFinally);

    final model = ProviderResponse.fromJson(res.data ?? const <String, dynamic>{});
    onSuccess?.call(model);
    return model;
  }

  static Future<ProviderResponse> updateProvider({
    required UpdateProviderRequest request,
    void Function(ProviderResponse response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
  }) async {
    final client = await AirEyeClient.create();
    final url = await _url(_providerPath);

    final res = await client.put<JsonMap>(url, data: request.toJson(), onError: onError, onFinally: onFinally);

    final model = ProviderResponse.fromJson(res.data ?? const <String, dynamic>{});
    onSuccess?.call(model);
    return model;
  }

  static Future<AutoAnalyseResponse> updateAutoAnalyse({
    required UpdateAutoAnalyseRequest request,
    void Function(AutoAnalyseResponse response)? onSuccess,
    void Function(Object error, StackTrace stackTrace)? onError,
    void Function()? onFinally,
  }) async {
    final client = await AirEyeClient.create();
    final url = await _url(_autoAnalysePath);

    final res = await client.put<JsonMap>(url, data: request.toJson(), onError: onError, onFinally: onFinally);

    final model = AutoAnalyseResponse.fromJson(res.data ?? const <String, dynamic>{});
    onSuccess?.call(model);
    return model;
  }
}
