import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/grim_colors.dart';

class GrimCopyTextButton extends StatefulWidget {
  const GrimCopyTextButton({super.key, required this.text});

  final String text;

  @override
  State<GrimCopyTextButton> createState() => _GrimCopyTextButtonState();
}

class _GrimCopyTextButtonState extends State<GrimCopyTextButton> {
  var _copied = false;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.text));
    setState(() => _copied = true);
    _timer?.cancel();
    _timer = Timer(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _copy,
      child: DecoratedBox(
        decoration: const BoxDecoration(
          color: GrimColors.overlayDark,
          shape: BoxShape.circle,
        ),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Icon(
            _copied ? Icons.check : Icons.copy,
            color: _copied ? GrimColors.accent : GrimColors.onSurface,
            size: 22,
          ),
        ),
      ),
    );
  }
}
