import 'package:flutter/material.dart';

import '../theme/grim_colors.dart';

class GrimBackButton extends StatelessWidget {
  const GrimBackButton({
    super.key,
    this.onPressed,
    this.color = GrimColors.onSurface,
    this.backgroundColor = GrimColors.overlayDark,
    this.padding = const EdgeInsets.all(4),
    this.icon = Icons.arrow_back,
    this.alignment = Alignment.topLeft,
  });

  final VoidCallback? onPressed;
  final Color color;
  final Color backgroundColor;
  final EdgeInsets padding;
  final IconData icon;
  final Alignment alignment;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Align(
        alignment: alignment,
        child: Padding(
          padding: padding,
          child: DecoratedBox(
            decoration: BoxDecoration(color: backgroundColor, shape: BoxShape.circle),
            child: IconButton(
              icon: Icon(icon, color: color),
              onPressed: onPressed ?? () => Navigator.of(context).maybePop(),
              tooltip: MaterialLocalizations.of(context).backButtonTooltip,
            ),
          ),
        ),
      ),
    );
  }
}
