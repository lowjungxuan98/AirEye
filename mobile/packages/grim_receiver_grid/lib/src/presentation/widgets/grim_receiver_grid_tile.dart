import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';

import '../../domain/grim_export_row.dart';

class GrimReceiverGridTile extends StatelessWidget {
  const GrimReceiverGridTile({super.key, required this.row, required this.onImageTap});

  final GrimExportRow row;
  final void Function(GrimExportRow row) onImageTap;

  static const Color _tileA = Color(0xFF14161C);
  static const Color _tileB = Color(0xFF1C212A);

  @override
  Widget build(BuildContext context) {
    final base = row.hasError ? const Color(0xFF2A1518) : (row.hasImage ? _tileA : _tileB);

    return Material(
      color: base,
      child: InkWell(
        onTap: row.hasImage ? () => onImageTap(row) : null,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (row.hasImage)
              Image.network(
                row.imageUrl!,
                fit: BoxFit.cover,
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) {
                    return child;
                  }
                  return const Center(
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2, color: GrimColors.accent),
                    ),
                  );
                },
                errorBuilder: (_, _, _) =>
                    const Center(child: Icon(Icons.broken_image_outlined, color: Colors.white38, size: 32)),
              )
            else if (row.hasError)
              const Center(child: Icon(Icons.error_outline, color: Color(0xFFE57373), size: 32))
            else
              const Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2, color: GrimColors.accent),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
