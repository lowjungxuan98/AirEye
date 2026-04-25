import 'grim_export_page_result.dart';

abstract interface class GrimExportRepository {
  Future<GrimExportPageResult> fetchPage({required int page, required int limit});
}
