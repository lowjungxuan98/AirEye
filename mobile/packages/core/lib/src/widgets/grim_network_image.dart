import 'package:flutter/material.dart';

class GrimNetworkImage extends StatefulWidget {
  const GrimNetworkImage({
    super.key,
    required this.imageUrl,
    this.zoom = false,
    this.isNew = false,
    this.fit = BoxFit.cover,
    this.backgroundColor = Colors.black,
  });

  final String imageUrl;
  final bool zoom;
  final bool isNew;
  final BoxFit fit;
  final Color backgroundColor;

  @override
  State<GrimNetworkImage> createState() => _GrimNetworkImageState();
}

class _GrimNetworkImageState extends State<GrimNetworkImage> {
  final _transformController = TransformationController();

  @override
  void didUpdateWidget(covariant GrimNetworkImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl) {
      NetworkImage(oldWidget.imageUrl).evict();
    }
  }

  @override
  void dispose() {
    _transformController.dispose();
    NetworkImage(widget.imageUrl).evict();
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
    Widget child = Image.network(
      widget.imageUrl,
      fit: widget.fit,
      filterQuality: FilterQuality.low,
      frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
        if (wasSynchronouslyLoaded || frame != null) return child;
        return _placeholder();
      },
      errorBuilder: (context, error, stackTrace) => _error(),
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
