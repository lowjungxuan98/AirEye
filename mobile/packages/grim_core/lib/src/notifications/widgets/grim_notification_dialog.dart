import 'package:flutter/material.dart';

import '../../theme/grim_colors.dart';

class GrimNotificationDialog extends StatelessWidget {
  const GrimNotificationDialog({super.key});

  @override
  Widget build(BuildContext context) {
    final buttonTextStyle =
        Theme.of(context).textTheme.labelLarge?.copyWith(
          color: Colors.black,
          fontSize: 12.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
          height: 1.15,
        ) ??
        const TextStyle(
          color: Colors.black,
          fontSize: 12.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
          height: 1.15,
        );

    return Container(
      width: 320,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: GrimColors.surfaceRaised,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.45), blurRadius: 24, offset: const Offset(0, 12)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: const SizedBox(height: 180, child: ColoredBox(color: Color(0xFF262E44))),
          ),
          const SizedBox(height: 16),
          const Text(
            'You are about to switch to a compact mobile dialog optimized for one-hand controls. Streaming continues without disconnecting the session.',
            style: TextStyle(color: Color(0xFF9BA3AF), fontSize: 13, height: 1.45),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: GrimColors.accentAlt,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: const StadiumBorder(),
                textStyle: buttonTextStyle,
              ),
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('COPY'),
            ),
          ),
        ],
      ),
    );
  }
}
