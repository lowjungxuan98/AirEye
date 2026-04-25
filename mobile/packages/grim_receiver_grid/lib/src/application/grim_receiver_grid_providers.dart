import 'package:grim_core/grim_core.dart';

import '../data/grim_capture_remote_data_source.dart';
import '../data/grim_capture_repository_impl.dart';
import '../data/grim_export_remote_data_source.dart';
import '../data/grim_export_repository_impl.dart';
import '../domain/grim_capture_repository.dart';
import '../domain/grim_export_page_result.dart';
import '../domain/grim_export_repository.dart';

/// Shared HTTP client for receiver features (base URL from [GrimEndpoints]).
final grimReceiverApiClientProvider = Provider<GrimDioClient>((ref) {
  return GrimDioClient();
});

final grimExportRepositoryProvider = Provider<GrimExportRepository>((ref) {
  final apiClient = ref.watch(grimReceiverApiClientProvider);
  return GrimExportRepositoryImpl(GrimExportRemoteDataSource(apiClient));
});

final grimCaptureRepositoryProvider = Provider<GrimCaptureRepository>((ref) {
  final apiClient = ref.watch(grimReceiverApiClientProvider);
  return GrimCaptureRepositoryImpl(GrimCaptureRemoteDataSource(apiClient));
});

final grimReceiverFcmManagerProvider = Provider<GrimFcmManager>((ref) {
  return GrimFcmManager();
});

/// First page of export rows for the grid (4×12 tiles; max API limit is 50).
final grimReceiverExportPageProvider = FutureProvider.autoDispose<GrimExportPageResult>((ref) async {
  final repo = ref.watch(grimExportRepositoryProvider);
  return repo.fetchPage(page: 1, limit: 48);
});
