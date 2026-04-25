class GrimReceiverGridState {
  const GrimReceiverGridState({this.isRequestingCapture = false});

  final bool isRequestingCapture;

  GrimReceiverGridState copyWith({bool? isRequestingCapture}) {
    return GrimReceiverGridState(isRequestingCapture: isRequestingCapture ?? this.isRequestingCapture);
  }
}

class GrimReceiverCaptureResult {
  const GrimReceiverCaptureResult._({required this.isSuccess, this.errorMessage});

  const GrimReceiverCaptureResult.success() : this._(isSuccess: true);

  const GrimReceiverCaptureResult.failure(String message) : this._(isSuccess: false, errorMessage: message);

  final bool isSuccess;
  final String? errorMessage;
}
