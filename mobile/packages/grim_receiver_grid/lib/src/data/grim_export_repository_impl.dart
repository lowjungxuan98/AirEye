import '../domain/grim_export_page_result.dart';
import '../domain/grim_export_repository.dart';
import 'grim_export_remote_data_source.dart';

class GrimExportRepositoryImpl implements GrimExportRepository {
  GrimExportRepositoryImpl(this._remote);

  final GrimExportRemoteDataSource _remote;

  @override
  Future<GrimExportPageResult> fetchPage({required int page, required int limit}) {
    return _remote.fetchPage(page: page, limit: limit);
  }
}
