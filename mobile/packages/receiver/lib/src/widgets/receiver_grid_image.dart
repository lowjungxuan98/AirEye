import 'package:core/core.dart';

class ReceiverGridImage extends StatefulWidget {
  const ReceiverGridImage({super.key, required this.imageUrl});

  final String imageUrl;

  @override
  State<ReceiverGridImage> createState() => _ReceiverGridImageState();
}

class _ReceiverGridImageState extends State<ReceiverGridImage> {
  @override
  void didUpdateWidget(covariant ReceiverGridImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl) {
      _evict(oldWidget.imageUrl);
    }
  }

  @override
  void dispose() {
    _evict(widget.imageUrl);
    super.dispose();
  }

  void _evict(String imageUrl) {
    NetworkImage(imageUrl).evict();
  }

  @override
  Widget build(BuildContext context) {
    final dpr = MediaQuery.devicePixelRatioOf(context);
    final shortestSide = MediaQuery.sizeOf(context).shortestSide;
    final targetWidth = ((shortestSide / 4) * dpr).round().clamp(160, 512);

    return Image.network(
      widget.imageUrl,
      fit: BoxFit.cover,
      cacheWidth: targetWidth,
      filterQuality: FilterQuality.low,
      frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
        if (wasSynchronouslyLoaded || frame != null) return child;
        return const ColoredBox(
          color: Colors.black,
          child: Center(child: CircularProgressIndicator()),
        );
      },
      errorBuilder: (context, error, stackTrace) => const ColoredBox(
        color: Colors.black,
        child: Center(child: Icon(Icons.broken_image)),
      ),
    );
  }
}
