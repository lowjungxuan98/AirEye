import 'package:core/core.dart';
import 'package:zai/zai.dart';

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
            child: GrimImageContextMenu(
              imageUrl: imageUrl,
              text: text?.isNotEmpty == true ? text! : '',
              error: err?.isNotEmpty == true ? err : null,
              child: GrimCachedZoomableImage(imageUrl: imageUrl, zoom: true, fit: BoxFit.contain),
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
                    const _ZaiButton(),
                    const SizedBox(height: 8),
                    GrimDownloadImageButton(imageUrl: imageUrl),
                    const SizedBox(height: 8),
                    GrimCopyTextButton(text: text?.isNotEmpty == true ? text! : ''),
                  ],
                ),
              ),
            ),
          ),
          GrimTextSheet(text: text?.isNotEmpty == true ? text! : 'No text', error: err?.isNotEmpty == true ? err : null),
        ],
      ),
    );
  }
}

class _ZaiButton extends StatelessWidget {
  const _ZaiButton();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ZaiView())),
      child: const DecoratedBox(
        decoration: BoxDecoration(color: GrimColors.overlayDark, shape: BoxShape.circle),
        child: Padding(
          padding: EdgeInsets.all(10),
          child: SizedBox.square(
            dimension: 22,
            child: Center(
              child: Text(
                'Z',
                style: TextStyle(color: GrimColors.onSurface, fontSize: 16, fontWeight: FontWeight.w800, height: 1),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
