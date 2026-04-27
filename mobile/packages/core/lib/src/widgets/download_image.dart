import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:gal/gal.dart';

import '../theme/grim_colors.dart';

class GrimDownloadImageButton extends StatefulWidget {
  const GrimDownloadImageButton({super.key, required this.imageUrl});

  final String imageUrl;

  @override
  State<GrimDownloadImageButton> createState() => _GrimDownloadImageButtonState();
}

class _GrimDownloadImageButtonState extends State<GrimDownloadImageButton> {
  var _loading = false;

  Future<void> _download() async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      final response = await Dio().get<List<int>>(widget.imageUrl, options: Options(responseType: ResponseType.bytes));
      await Gal.putImageBytes(Uint8List.fromList(response.data!));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Image saved to gallery')));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to save image')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _OverlayButton(
      onTap: _download,
      child: _loading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: GrimColors.onSurface),
            )
          : const Icon(Icons.download, color: GrimColors.onSurface, size: 22),
    );
  }
}

class _OverlayButton extends StatelessWidget {
  const _OverlayButton({required this.onTap, required this.child});

  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: DecoratedBox(
        decoration: const BoxDecoration(color: GrimColors.overlayDark, shape: BoxShape.circle),
        child: Padding(padding: const EdgeInsets.all(10), child: child),
      ),
    );
  }
}
