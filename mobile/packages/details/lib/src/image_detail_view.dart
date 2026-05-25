import 'package:core/core.dart';
import 'package:flutter/services.dart';
import 'package:zai/zai.dart';

import 'image_detail_controller.dart';
import 'image_detail_state.dart';

class ImageDetailView extends BaseStatefulPage {
  const ImageDetailView({super.key, required this.item});

  final ExportListItem item;

  @override
  BasePageState createState() => _ImageDetailViewState();
}

class _ImageDetailViewState extends BasePageState<ImageDetailView> {
  static const double _initialImageFraction = 0.6;
  static const double _minPaneFraction = 0.25;
  static const double _dividerWidth = 16;

  double _landscapeImageFraction = _initialImageFraction;

  @override
  void initState() {
    super.initState();
    SystemChrome.setPreferredOrientations(const [DeviceOrientation.portraitUp, DeviceOrientation.landscapeLeft, DeviceOrientation.landscapeRight]);
  }

  @override
  void dispose() {
    SystemChrome.setPreferredOrientations(const [DeviceOrientation.portraitUp]);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(imageDetailControllerProvider);
    final controller = ref.read(imageDetailControllerProvider.notifier);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (state is ImageDetailInitial) {
        controller.init(widget.item);
      }
    });

    final currentItem = state is ImageDetailReady ? state.item : widget.item;
    final imageUrl = currentItem.imageUrl ?? '';
    final text = currentItem.finalText?.trim();
    final err = currentItem.errorMessage?.trim();
    final displayText = text?.isNotEmpty == true ? text! : 'No text';
    final contextMenuText = text?.isNotEmpty == true ? text! : '';
    final displayError = err?.isNotEmpty == true ? err : null;

    return Scaffold(
      backgroundColor: GrimColors.scaffold,
      body: OrientationBuilder(
        builder: (context, orientation) {
          final image = GrimImageContextMenu(
            imageUrl: imageUrl,
            text: contextMenuText,
            error: displayError,
            child: GrimNetworkImage(imageUrl: imageUrl, zoom: true, fit: BoxFit.contain),
          );

          if (orientation == Orientation.landscape) {
            return LayoutBuilder(
              builder: (context, constraints) {
                final availableWidth = constraints.maxWidth - _dividerWidth;
                final imageWidth = availableWidth * _landscapeImageFraction;
                final textWidth = availableWidth - imageWidth;

                return Row(
                  children: [
                    SizedBox(
                      width: imageWidth,
                      child: Stack(
                        children: [
                          Positioned.fill(child: image),
                          const GrimBackButton(),
                        ],
                      ),
                    ),
                    _LandscapeSplitHandle(
                      width: _dividerWidth,
                      onDrag: (delta) {
                        setState(() {
                          _landscapeImageFraction = (_landscapeImageFraction + delta / availableWidth).clamp(_minPaneFraction, 1 - _minPaneFraction);
                        });
                      },
                    ),
                    SizedBox(
                      width: textWidth,
                      child: _LandscapeTextPanel(key: const Key('imageDetailLandscapeTextPanel'), imageUrl: imageUrl, text: displayText, copyText: contextMenuText, error: displayError),
                    ),
                  ],
                );
              },
            );
          }

          return Stack(
            children: [
              Positioned.fill(child: image),
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
                        GrimCopyTextButton(text: contextMenuText),
                      ],
                    ),
                  ),
                ),
              ),
              GrimTextSheet(text: displayText, error: displayError),
            ],
          );
        },
      ),
    );
  }
}

class _LandscapeSplitHandle extends StatelessWidget {
  const _LandscapeSplitHandle({required this.width, required this.onDrag});

  final double width;
  final ValueChanged<double> onDrag;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      key: const Key('imageDetailLandscapeSplitHandle'),
      behavior: HitTestBehavior.opaque,
      onHorizontalDragUpdate: (details) => onDrag(details.delta.dx),
      child: MouseRegion(
        cursor: SystemMouseCursors.resizeColumn,
        child: ColoredBox(
          color: GrimColors.surface,
          child: SizedBox(
            width: width,
            child: Center(
              child: Container(
                width: 3,
                height: 44,
                decoration: BoxDecoration(color: GrimColors.outline, borderRadius: BorderRadius.circular(2)),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LandscapeTextPanel extends StatelessWidget {
  const _LandscapeTextPanel({super.key, required this.imageUrl, required this.text, required this.copyText, this.error});

  final String imageUrl;
  final String text;
  final String copyText;
  final String? error;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: GrimColors.surface,
      child: SafeArea(
        left: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  const _ZaiButton(),
                  const SizedBox(width: 8),
                  GrimDownloadImageButton(imageUrl: imageUrl),
                  const SizedBox(width: 8),
                  GrimCopyTextButton(text: copyText),
                ],
              ),
            ),
            const Divider(color: GrimColors.outline, height: 1),
            Expanded(
              child: GrimTextContent(text: text, error: error, padding: const EdgeInsets.fromLTRB(16, 16, 16, 24)),
            ),
          ],
        ),
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
