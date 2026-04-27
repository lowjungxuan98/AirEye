import 'package:core/core.dart';
import 'package:flutter/services.dart';

import 'sender_controller.dart';
import 'sender_state.dart';

class SenderView extends BaseStatefulPage {
  const SenderView({super.key});

  @override
  BasePageState<SenderView> createState() => _SenderViewState();
}

class _SenderViewState extends BasePageState<SenderView> {
  @override
  void initState() {
    super.initState();
    SystemChrome.setPreferredOrientations(const [
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  }

  @override
  void dispose() {
    SystemChrome.setPreferredOrientations(const [DeviceOrientation.portraitUp]);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(senderControllerProvider);
    final senderController = ref.read(senderControllerProvider.notifier);

    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: switch (state) {
              SenderLoading() => const Center(
                child: CircularProgressIndicator(),
              ),
              _ => HighQualityCameraWidget(
                controller: senderController.cameraController,
                previewFit: CameraPreviewFit.contain,
                showCaptureButton: false,
                onImageCaptured: (_) {},
              ),
            },
          ),
          const GrimBackButton(),
          if (state is SenderCapturing)
            const Positioned(
              right: 16,
              bottom: 16,
              child: SafeArea(
                child: SizedBox.square(
                  dimension: 28,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ),
          if (state case SenderError(:final message))
            Positioned(
              left: 16,
              right: 16,
              bottom: 16,
              child: SafeArea(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(
                      message,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onErrorContainer,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
