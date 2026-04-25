import 'package:flutter/material.dart';

import '../theme/grim_colors.dart';

class GrimBrandLockup extends StatelessWidget {
  const GrimBrandLockup({
    super.key,
    this.titleSize = 36,
    this.subtitleSize = 14,
    this.titleLetterSpacing = 1.2,
    this.crossAxisAlignment = CrossAxisAlignment.start,
    this.textAlign = TextAlign.start,
    this.spacing = 6,
  });

  final double titleSize;
  final double subtitleSize;
  final double titleLetterSpacing;
  final CrossAxisAlignment crossAxisAlignment;
  final TextAlign textAlign;
  final double spacing;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: crossAxisAlignment,
      children: [
        Text(
          'GRIM',
          textAlign: textAlign,
          style: TextStyle(
            color: GrimColors.accent,
            fontSize: titleSize,
            fontWeight: FontWeight.w800,
            letterSpacing: titleLetterSpacing,
          ),
        ),
        SizedBox(height: spacing),
        Text(
          'Secure visual relay',
          textAlign: textAlign,
          style: TextStyle(color: GrimColors.subtitle, fontSize: subtitleSize, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}
