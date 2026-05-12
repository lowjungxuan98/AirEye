import 'package:flutter/material.dart';

/// Applies [factor] to each non-null [TextStyle.fontSize] (clamped for readability).
TextTheme scaleTextThemeFontSizes(TextTheme theme, double factor) {
  TextStyle? scale(
    TextStyle? style, {
    double minSize = 10,
    double maxSize = 36,
  }) {
    if (style == null) return null;
    final size = style.fontSize;
    if (size == null) return style;
    final scaled = (size * factor).clamp(minSize, maxSize).toDouble();
    return style.copyWith(fontSize: scaled);
  }

  return TextTheme(
    displayLarge: scale(theme.displayLarge, maxSize: 40),
    displayMedium: scale(theme.displayMedium, maxSize: 36),
    displaySmall: scale(theme.displaySmall, maxSize: 32),
    headlineLarge: scale(theme.headlineLarge, maxSize: 30),
    headlineMedium: scale(theme.headlineMedium, maxSize: 26),
    headlineSmall: scale(theme.headlineSmall, maxSize: 22),
    titleLarge: scale(theme.titleLarge, maxSize: 20),
    titleMedium: scale(theme.titleMedium, maxSize: 17),
    titleSmall: scale(theme.titleSmall, maxSize: 15),
    bodyLarge: scale(theme.bodyLarge, maxSize: 17),
    bodyMedium: scale(theme.bodyMedium, maxSize: 15),
    bodySmall: scale(theme.bodySmall, maxSize: 13),
    labelLarge: scale(theme.labelLarge, maxSize: 14),
    labelMedium: scale(theme.labelMedium, maxSize: 13),
    labelSmall: scale(theme.labelSmall, maxSize: 11),
  );
}
