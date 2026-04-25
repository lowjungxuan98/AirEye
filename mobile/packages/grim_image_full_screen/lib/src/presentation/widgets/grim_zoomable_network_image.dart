import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';

class GrimZoomableNetworkImage extends StatelessWidget {
  const GrimZoomableNetworkImage({super.key, required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return InteractiveViewer(
      minScale: 1,
      maxScale: 5,
      clipBehavior: Clip.none,
      child: SizedBox.expand(
        child: Image.network(
          url,
          fit: BoxFit.contain,
          alignment: Alignment.center,
          filterQuality: FilterQuality.high,
          errorBuilder: (context, error, stackTrace) {
            return const Center(
              child: Icon(Icons.image_not_supported_outlined, color: GrimColors.placeholderIcon, size: 48),
            );
          },
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) {
              return child;
            }
            return const Center(
              child: SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(strokeWidth: 2, color: GrimColors.accent),
              ),
            );
          },
        ),
      ),
    );
  }
}
