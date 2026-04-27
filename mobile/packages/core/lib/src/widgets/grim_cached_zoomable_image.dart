import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

class GrimCachedZoomableImage extends StatefulWidget {
  const GrimCachedZoomableImage({
    super.key,
    required this.imageUrl,
    this.zoom = false,
    this.isNew = false,
    this.fit = BoxFit.cover,
    this.backgroundColor = Colors.black,
  });

  final String imageUrl;
  final bool zoom;

  /// `new` is a reserved keyword; use `isNew`.
  final bool isNew;

  final BoxFit fit;
  final Color backgroundColor;

  @override
  State<GrimCachedZoomableImage> createState() => _GrimCachedZoomableImageState();
}

class _GrimCachedZoomableImageState extends State<GrimCachedZoomableImage> {
  final _transformController = TransformationController();

  @override
  void dispose() {
    _transformController.dispose();
    super.dispose();
  }

  Widget _placeholder() => ColoredBox(
    color: widget.backgroundColor,
    child: const Center(child: CircularProgressIndicator()),
  );

  Widget _error() => ColoredBox(
    color: widget.backgroundColor,
    child: const Center(child: Icon(Icons.broken_image)),
  );

  @override
  Widget build(BuildContext context) {
    Widget child = CachedNetworkImage(
      imageUrl: widget.imageUrl,
      fit: widget.fit,
      placeholder: (context, url) => _placeholder(),
      errorWidget: (context, url, error) => _error(),
    );

    if (widget.zoom) {
      child = GestureDetector(
        onDoubleTap: () => _transformController.value = Matrix4.identity(),
        child: InteractiveViewer(
          transformationController: _transformController,
          clipBehavior: Clip.none,
          boundaryMargin: const EdgeInsets.all(80),
          minScale: 1,
          maxScale: 4,
          child: child,
        ),
      );
    }

    if (!widget.isNew) return child;

    return Stack(
      children: [
        Positioned.fill(child: child),
        Positioned(
          top: 8,
          left: 8,
          child: DecoratedBox(
            decoration: BoxDecoration(color: Colors.green, borderRadius: BorderRadius.circular(6)),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Text(
                'NEW',
                style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
