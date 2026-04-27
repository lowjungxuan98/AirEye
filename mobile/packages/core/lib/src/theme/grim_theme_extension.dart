import 'package:flutter/material.dart';

/// GRIM-specific colors not covered by [ColorScheme] alone.
@immutable
class GrimThemeExtension extends ThemeExtension<GrimThemeExtension> {
  const GrimThemeExtension({
    required this.subtitle,
    required this.navTile,
    required this.navTileBorder,
    required this.sectionLabel,
    required this.mutedText,
    required this.chevron,
  });

  /// Muted olive under the wordmark (e.g. "Secure visual relay").
  final Color subtitle;

  /// Core hub list tile surface.
  final Color navTile;

  final Color navTileBorder;
  final Color sectionLabel;
  final Color mutedText;
  final Color chevron;

  static const GrimThemeExtension dark = GrimThemeExtension(
    subtitle: Color(0xFF6B7A52),
    navTile: Color(0xFF12161C),
    navTileBorder: Color(0xFF2A3038),
    sectionLabel: Color(0xFF9AA3AD),
    mutedText: Color(0xFF7A8088),
    chevron: Color(0xFF5C656F),
  );

  @override
  GrimThemeExtension copyWith({
    Color? subtitle,
    Color? navTile,
    Color? navTileBorder,
    Color? sectionLabel,
    Color? mutedText,
    Color? chevron,
  }) {
    return GrimThemeExtension(
      subtitle: subtitle ?? this.subtitle,
      navTile: navTile ?? this.navTile,
      navTileBorder: navTileBorder ?? this.navTileBorder,
      sectionLabel: sectionLabel ?? this.sectionLabel,
      mutedText: mutedText ?? this.mutedText,
      chevron: chevron ?? this.chevron,
    );
  }

  @override
  GrimThemeExtension lerp(ThemeExtension<GrimThemeExtension>? other, double t) {
    if (other is! GrimThemeExtension) return this;
    return GrimThemeExtension(
      subtitle: Color.lerp(subtitle, other.subtitle, t)!,
      navTile: Color.lerp(navTile, other.navTile, t)!,
      navTileBorder: Color.lerp(navTileBorder, other.navTileBorder, t)!,
      sectionLabel: Color.lerp(sectionLabel, other.sectionLabel, t)!,
      mutedText: Color.lerp(mutedText, other.mutedText, t)!,
      chevron: Color.lerp(chevron, other.chevron, t)!,
    );
  }
}

extension GrimThemeExtensionX on BuildContext {
  GrimThemeExtension get grimExtension {
    return Theme.of(this).extension<GrimThemeExtension>() ?? GrimThemeExtension.dark;
  }
}
