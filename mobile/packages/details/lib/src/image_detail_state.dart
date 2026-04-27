import 'package:core/core.dart';

sealed class ImageDetailState extends BaseState {
  const ImageDetailState();
}

class ImageDetailInitial extends ImageDetailState {
  const ImageDetailInitial();
}

class ImageDetailLoading extends ImageDetailState {
  const ImageDetailLoading();
}

class ImageDetailReady extends ImageDetailState {
  const ImageDetailReady();
}

class ImageDetailError extends ImageDetailState {
  const ImageDetailError(this.message);
  final String message;
}
