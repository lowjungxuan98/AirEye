import '../domain/grim_capture_repository.dart';
import 'grim_capture_remote_data_source.dart';

class GrimCaptureRepositoryImpl implements GrimCaptureRepository {
  GrimCaptureRepositoryImpl(this._remote);

  final GrimCaptureRemoteDataSource _remote;

  @override
  Future<void> requestCapture() {
    return _remote.requestCapture();
  }
}
