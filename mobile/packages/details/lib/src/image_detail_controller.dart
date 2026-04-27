import 'package:core/core.dart';
import 'image_detail_state.dart';

class ImageDetailController extends BaseController<ImageDetailState> {
  @override
  ImageDetailState build() => const ImageDetailInitial();

  @override
  bool get isLoading => state is ImageDetailLoading;

  @override
  void setLoading() => state = const ImageDetailLoading();

  @override
  void setError(String message) => state = ImageDetailError(message);
}

final imageDetailControllerProvider = BaseNotifierProvider<ImageDetailController, ImageDetailState>(
  ImageDetailController.new,
);
