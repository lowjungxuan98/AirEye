import 'package:core/core.dart';
import 'image_detail_controller.dart';
import 'image_detail_state.dart';

class ImageDetailView extends BasePage {
  const ImageDetailView({super.key, required this.item});

  final ExportListItem item;

  @override
  Widget buildPage(context, ref) {
    final state = ref.watch(imageDetailControllerProvider);
    final controller = ref.read(imageDetailControllerProvider.notifier);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (state is ImageDetailInitial) {
        controller.init(item);
      }
    });

    final currentItem = state is ImageDetailReady ? state.item : item;
    final imageUrl = currentItem.imageUrl ?? '';
    final text = currentItem.finalText?.trim();
    final err = currentItem.errorMessage?.trim();

    return Scaffold(
      backgroundColor: GrimColors.scaffold,
      body: Stack(
        children: [
          Positioned.fill(
            child: GrimCachedZoomableImage(
              imageUrl: imageUrl,
              zoom: true,
              fit: BoxFit.contain,
            ),
          ),
          const GrimBackButton(),
          SafeArea(
            child: Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    GrimDownloadImageButton(imageUrl: imageUrl),
                    const SizedBox(height: 8),
                    GrimCopyTextButton(
                      text: text?.isNotEmpty == true ? text! : '',
                    ),
                  ],
                ),
              ),
            ),
          ),
          GrimTextSheet(
            text: text?.isNotEmpty == true ? text! : 'No text',
            error: err?.isNotEmpty == true ? err : null,
          ),
        ],
      ),
    );
  }
}
