import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/grim_colors.dart';

class GrimCopyTextButton extends StatelessWidget {
  const GrimCopyTextButton({super.key, required this.text});

  final String text;

  Future<void> _copy(BuildContext context) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Text copied')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _copy(context),
      child: const DecoratedBox(
        decoration: BoxDecoration(color: GrimColors.overlayDark, shape: BoxShape.circle),
        child: Padding(
          padding: EdgeInsets.all(10),
          child: Icon(Icons.copy, color: GrimColors.onSurface, size: 22),
        ),
      ),
    );
  }
}
