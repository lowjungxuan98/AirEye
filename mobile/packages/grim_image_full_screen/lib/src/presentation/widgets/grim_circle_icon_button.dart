import 'package:flutter/material.dart';

class GrimCircleIconButton extends StatelessWidget {
  const GrimCircleIconButton({super.key, required this.icon, required this.onPressed, this.tooltip, this.isLoading = false});

  final IconData icon;
  final VoidCallback? onPressed;
  final String? tooltip;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      onPressed: isLoading ? null : onPressed,
      style: IconButton.styleFrom(
        backgroundColor: Colors.black.withValues(alpha: 0.45),
        foregroundColor: Colors.white,
        disabledBackgroundColor: Colors.black.withValues(alpha: 0.45),
        disabledForegroundColor: Colors.white,
        fixedSize: const Size(44, 44),
        padding: EdgeInsets.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        shape: const CircleBorder(),
      ),
      icon: isLoading
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            )
          : Icon(icon, size: 22),
    );
  }
}
