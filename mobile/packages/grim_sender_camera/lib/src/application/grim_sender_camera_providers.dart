import 'package:grim_core/grim_core.dart';

import '../data/grim_sender_import_repository_impl.dart';
import '../domain/grim_sender_import_repository.dart';
import 'grim_sender_capture_flow_controller.dart';

final grimSenderApiClientProvider = Provider<GrimDioClient>((ref) {
  return GrimDioClient();
});

final grimSenderImportClientProvider = Provider<GrimImportStreamClient>((ref) {
  final apiClient = ref.watch(grimSenderApiClientProvider);
  return GrimImportStreamClient(dio: apiClient.dio);
});

final grimSenderImportRepositoryProvider = Provider<GrimSenderImportRepository>((ref) {
  final client = ref.watch(grimSenderImportClientProvider);
  return GrimSenderImportRepositoryImpl(client);
});

final grimSenderFcmManagerProvider = Provider<GrimFcmManager>((ref) {
  return GrimFcmManager();
});

final grimSenderCaptureFlowControllerProvider = Provider<GrimSenderCaptureFlowController>((ref) {
  return GrimSenderCaptureFlowController(
    fcmManager: ref.watch(grimSenderFcmManagerProvider),
    repository: ref.watch(grimSenderImportRepositoryProvider),
  );
});
