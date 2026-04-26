import '../domain/grim_export_row.dart';

class GrimReceiverGridState {
  const GrimReceiverGridState({
    this.isRequestingCapture = false,
    this.hasLoadedOpenedImageKeys = false,
    this.openedImageKeys = const <String>{},
  });

  final bool isRequestingCapture;
  final bool hasLoadedOpenedImageKeys;
  final Set<String> openedImageKeys;

  bool isNewImage(GrimExportRow row) {
    final imageKey = row.openedImageKey;
    return hasLoadedOpenedImageKeys && imageKey != null && !openedImageKeys.contains(imageKey);
  }

  GrimReceiverGridState copyWith({
    bool? isRequestingCapture,
    bool? hasLoadedOpenedImageKeys,
    Set<String>? openedImageKeys,
  }) {
    return GrimReceiverGridState(
      isRequestingCapture: isRequestingCapture ?? this.isRequestingCapture,
      hasLoadedOpenedImageKeys: hasLoadedOpenedImageKeys ?? this.hasLoadedOpenedImageKeys,
      openedImageKeys: openedImageKeys ?? this.openedImageKeys,
    );
  }
}

class GrimReceiverCaptureResult {
  const GrimReceiverCaptureResult._({required this.isSuccess, this.errorMessage});

  const GrimReceiverCaptureResult.success() : this._(isSuccess: true);

  const GrimReceiverCaptureResult.failure(String message) : this._(isSuccess: false, errorMessage: message);

  final bool isSuccess;
  final String? errorMessage;
}
