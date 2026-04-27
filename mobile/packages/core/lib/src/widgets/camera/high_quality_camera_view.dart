part of 'high_quality_camera_widget.dart';

class _HighQualityCameraView extends StatelessWidget {
  const _HighQualityCameraView({
    required this.controller,
    required this.error,
    required this.focusY,
    required this.isTakingPicture,
    required this.previewFit,
    required this.showCaptureButton,
    required this.loadingWidget,
    required this.errorWidget,
    required this.onFocusYChanged,
    required this.onTakePicture,
  });

  final CameraController? controller;
  final Object? error;
  final double focusY;
  final bool isTakingPicture;
  final CameraPreviewFit previewFit;
  final bool showCaptureButton;
  final Widget? loadingWidget;
  final Widget? errorWidget;
  final ValueChanged<double> onFocusYChanged;
  final VoidCallback onTakePicture;

  @override
  Widget build(BuildContext context) {
    final error = this.error;

    if (error != null) {
      return errorWidget ?? CameraErrorView(error: error);
    }

    final controller = this.controller;

    if (controller == null || !controller.value.isInitialized) {
      return loadingWidget ?? const Center(child: CircularProgressIndicator());
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        _buildCameraPreview(controller),
        Positioned(
          right: 16,
          top: 0,
          bottom: 0,
          child: SafeArea(
            child: Center(
              child: CameraFocusSlider(value: 1 - focusY, onChanged: onFocusYChanged),
            ),
          ),
        ),
        if (showCaptureButton)
          Positioned(
            left: 0,
            right: 0,
            bottom: 32,
            child: Center(
              child: FloatingActionButton(
                heroTag: null,
                onPressed: isTakingPicture ? null : onTakePicture,
                child: isTakingPicture
                    ? const SizedBox.square(dimension: 24, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.camera_alt),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildCameraPreview(CameraController controller) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final viewSize = constraints.biggest;

        if (viewSize.width == 0 || viewSize.height == 0) {
          return const SizedBox.shrink();
        }

        final cameraAspectRatio = controller.value.aspectRatio;
        final previewAspectRatio = viewSize.width >= viewSize.height ? cameraAspectRatio : 1 / cameraAspectRatio;
        final viewAspectRatio = viewSize.width / viewSize.height;

        double previewWidth;
        double previewHeight;

        if (previewFit == CameraPreviewFit.cover) {
          if (viewAspectRatio > previewAspectRatio) {
            previewWidth = viewSize.width;
            previewHeight = previewWidth / previewAspectRatio;
          } else {
            previewHeight = viewSize.height;
            previewWidth = previewHeight * previewAspectRatio;
          }
        } else {
          if (viewAspectRatio > previewAspectRatio) {
            previewHeight = viewSize.height;
            previewWidth = previewHeight * previewAspectRatio;
          } else {
            previewWidth = viewSize.width;
            previewHeight = previewWidth / previewAspectRatio;
          }
        }

        return ClipRect(
          child: Center(
            child: SizedBox(width: previewWidth, height: previewHeight, child: CameraPreview(controller)),
          ),
        );
      },
    );
  }
}
