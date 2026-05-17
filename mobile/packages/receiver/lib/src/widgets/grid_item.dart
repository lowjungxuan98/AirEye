import 'dart:typed_data';

import 'package:core/core.dart';
import 'package:details/details.dart';
import 'package:dio/dio.dart';
import 'package:gal/gal.dart';
import 'text_ready_badge.dart';
import 'processing_pulse.dart';

class GridItem extends StatefulWidget {
  const GridItem({
    required this.item,
    required this.imageUrl,
    this.isRegenerating = false,
    this.onRegenerate,
    super.key,
  });

  final ExportListItem item;
  final String imageUrl;
  final bool isRegenerating;
  final Future<void> Function()? onRegenerate;

  @override
  State<GridItem> createState() => _GridItemState();
}

class _GridItemState extends State<GridItem> {
  double? _progress; // null = not downloading, 0.0–1.0 = in progress

  Future<void> _download() async {
    if (_progress != null) return;
    setState(() => _progress = 0);
    try {
      final response = await Dio().get<List<int>>(
        widget.imageUrl,
        options: Options(responseType: ResponseType.bytes),
        onReceiveProgress: (received, total) {
          if (!mounted || total <= 0) return;
          setState(() => _progress = received / total);
        },
      );
      await Gal.putImageBytes(Uint8List.fromList(response.data!));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Image saved to gallery')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to save image')),
        );
      }
    } finally {
      if (mounted) setState(() => _progress = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasText =
        widget.item.finalText?.trim().isNotEmpty == true &&
        !widget.isRegenerating;
    final progress = _progress;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ImageDetailView(item: widget.item),
          ),
        ),
        onLongPress: () {},
        child: Stack(
          children: [
            Positioned.fill(
              child: GrimImageContextMenu(
                imageUrl: widget.imageUrl,
                text: widget.item.finalText?.trim() ?? '',
                error: widget.item.errorMessage?.trim(),
                onDownload: _download,
                onRegenerate: widget.isRegenerating
                    ? null
                    : widget.onRegenerate,
                child: GrimCachedZoomableImage(imageUrl: widget.imageUrl),
              ),
            ),
            if (progress != null)
              Positioned.fill(
                child: ColoredBox(
                  color: const Color(0x99000000),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            value: progress > 0 ? progress : null,
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        ),
                        if (progress > 0) ...[
                          const SizedBox(height: 4),
                          Text(
                            '${(progress * 100).round()}%',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            Positioned(
              top: 4,
              right: 4,
              child: hasText ? const TextReadyBadge() : const ProcessingPulse(),
            ),
            if (widget.isRegenerating)
              const Positioned.fill(
                child: ColoredBox(
                  color: Color(0x66000000),
                  child: Center(
                    child: SizedBox.square(
                      dimension: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
