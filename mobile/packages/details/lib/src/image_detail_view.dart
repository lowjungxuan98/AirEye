import 'package:core/core.dart';

class ImageDetailView extends BasePage {
  const ImageDetailView({super.key, required this.item});

  final ExportListItem item;

  @override
  Widget buildPage(context, ref) {
    final imageUrl = item.imageUrl ?? '';
    final text = item.finalText?.trim();
    final err = item.errorMessage?.trim();

    return Scaffold(
      backgroundColor: GrimColors.scaffold,
      body: Stack(
        children: [
          Positioned.fill(
            child: GrimCachedZoomableImage(imageUrl: imageUrl, zoom: true, fit: BoxFit.contain),
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
                    GrimCopyTextButton(text: text?.isNotEmpty == true ? text! : ''),
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
