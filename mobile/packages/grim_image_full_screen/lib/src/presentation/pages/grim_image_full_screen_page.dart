import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';

import '../../application/grim_image_full_screen_controller.dart';
import '../../domain/grim_full_screen_image.dart';
import '../widgets/grim_circle_icon_button.dart';
import '../widgets/grim_final_text_panel.dart';
import '../widgets/grim_zoomable_network_image.dart';

const String kGrimDefaultDummyImageUrl = 'https://picsum.photos/200/300';

class GrimImageFullScreenPage extends ConsumerStatefulWidget {
  const GrimImageFullScreenPage({
    super.key,
    this.imageUrl = kGrimDefaultDummyImageUrl,
    this.finalText = '',
    this.contents = const [],
    this.initialIndex = 0,
    this.onClose,
    this.onPageViewed,
  });

  GrimImageFullScreenPage.content({super.key, required GrimFullScreenImage content, this.onClose, this.onPageViewed})
    : imageUrl = content.imageUrl,
      finalText = content.finalText,
      contents = <GrimFullScreenImage>[content],
      initialIndex = 0;

  final String imageUrl;
  final String finalText;
  final List<GrimFullScreenImage> contents;
  final int initialIndex;
  final VoidCallback? onClose;
  final ValueChanged<int>? onPageViewed;

  @override
  ConsumerState<GrimImageFullScreenPage> createState() => _GrimImageFullScreenPageState();
}

class _GrimImageFullScreenPageState extends ConsumerState<GrimImageFullScreenPage> {
  late final PageController _pageController;
  late int _currentIndex;

  List<GrimFullScreenImage> get _contents {
    if (widget.contents.isNotEmpty) {
      return widget.contents;
    }
    return [GrimFullScreenImage(imageUrl: widget.imageUrl, finalText: widget.finalText)];
  }

  GrimFullScreenImage get _currentContent => _contents[_currentIndex.clamp(0, _contents.length - 1)];

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex.clamp(0, _contents.length - 1);
    _pageController = PageController(initialPage: _currentIndex);
    widget.onPageViewed?.call(_currentIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final padding = MediaQuery.paddingOf(context);
    final state = ref.watch(grimImageFullScreenControllerProvider);

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        clipBehavior: Clip.hardEdge,
        children: [
          Positioned.fill(
            bottom: padding.bottom + 190,
            child: ColoredBox(
              color: Colors.black,
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() => _currentIndex = index);
                  widget.onPageViewed?.call(index);
                },
                itemCount: _contents.length,
                itemBuilder: (context, index) {
                  final content = _contents[index];
                  return Center(child: GrimZoomableNetworkImage(url: content.imageUrl));
                },
              ),
            ),
          ),
          Positioned(
            top: padding.top + 8,
            right: 16,
            child: Column(
              children: [
                GrimCircleIconButton(
                  icon: Icons.close,
                  tooltip: 'Close',
                  onPressed: widget.onClose ?? () => Navigator.of(context).maybePop(),
                ),
                const SizedBox(height: 12),
                GrimCircleIconButton(
                  icon: Icons.content_copy,
                  tooltip: 'Copy final text',
                  onPressed: () => _copyFinalText(context, ref),
                ),
                const SizedBox(height: 12),
                GrimCircleIconButton(
                  icon: Icons.file_download_outlined,
                  tooltip: 'Download image',
                  isLoading: state.isDownloading,
                  onPressed: () => _downloadImage(context, ref),
                ),
              ],
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Padding(
              padding: EdgeInsets.only(bottom: padding.bottom),
              child: GrimFinalTextPanel(text: _currentContent.finalText),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _copyFinalText(BuildContext context, WidgetRef ref) async {
    final result = await ref
        .read(grimImageFullScreenControllerProvider.notifier)
        .copyFinalText(_currentContent.finalText);
    if (!context.mounted) {
      return;
    }
    _showSnackBar(context, result.isSuccess ? 'Final text copied' : result.errorMessage ?? 'Copy failed');
  }

  Future<void> _downloadImage(BuildContext context, WidgetRef ref) async {
    final result = await ref
        .read(grimImageFullScreenControllerProvider.notifier)
        .downloadImage(_currentContent.imageUrl);
    if (!context.mounted) {
      return;
    }
    _showSnackBar(context, result.isSuccess ? 'Image saved to device' : result.errorMessage ?? 'Download failed');
  }

  static void _showSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}
