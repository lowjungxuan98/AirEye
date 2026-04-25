class GrimImageFullScreenState {
  const GrimImageFullScreenState({this.isDownloading = false});

  final bool isDownloading;

  GrimImageFullScreenState copyWith({bool? isDownloading}) {
    return GrimImageFullScreenState(isDownloading: isDownloading ?? this.isDownloading);
  }
}

class GrimImageActionResult {
  const GrimImageActionResult._({required this.isSuccess, this.errorMessage});

  const GrimImageActionResult.success() : this._(isSuccess: true);

  const GrimImageActionResult.failure(String message) : this._(isSuccess: false, errorMessage: message);

  final bool isSuccess;
  final String? errorMessage;
}
