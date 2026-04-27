import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'grim_colors.dart';
import 'grim_text_theme_utils.dart';
import 'grim_theme_extension.dart';

/// Global GRIM dark theme (neon lime on near-black).
abstract final class GrimAppTheme {
  static const Color _accent = GrimColors.accent;
  static const Color _canvas = GrimColors.scaffold;
  static const Color _surface = GrimColors.surface;
  static const Color _onSurface = GrimColors.onSurface;

  /// Single app theme: dark, Material 3.
  static ThemeData get dark {
    final baseScheme = ColorScheme.fromSeed(
      seedColor: _accent,
      brightness: Brightness.dark,
      primary: _accent,
      onPrimary: const Color(0xFF0B0E14),
      surface: _surface,
      onSurface: _onSurface,
    );

    final colorScheme = baseScheme.copyWith(
      surfaceContainerLow: GrimColors.surfaceAlt,
      surfaceContainerHigh: GrimColors.surfaceHigh,
      outline: GrimColors.outline,
      outlineVariant: const Color(0xFF3A424D),
    );

    final mergedText = Typography.material2021(platform: TargetPlatform.iOS, colorScheme: colorScheme).black.merge(
      TextTheme(
        headlineLarge: const TextStyle(color: _accent, fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: 0.8),
        titleMedium: TextStyle(color: colorScheme.onSurface, fontWeight: FontWeight.w700, fontSize: 15),
        bodyMedium: TextStyle(color: colorScheme.onSurfaceVariant, fontWeight: FontWeight.w500, fontSize: 13),
        labelLarge: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.6, fontSize: 12),
      ),
    );

    final textTheme = scaleTextThemeFontSizes(GoogleFonts.jetBrainsMonoTextTheme(mergedText), 0.9);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: _canvas,
      canvasColor: _canvas,
      extensions: const [GrimThemeExtension.dark],
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: _canvas,
        foregroundColor: _onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: textTheme.titleLarge?.copyWith(color: _onSurface, fontWeight: FontWeight.w600),
      ),
      cardTheme: CardThemeData(
        color: _surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: colorScheme.outline),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: _accent,
          foregroundColor: colorScheme.onPrimary,
          disabledBackgroundColor: colorScheme.outline.withValues(alpha: 0.45),
          disabledForegroundColor: colorScheme.onSurface.withValues(alpha: 0.38),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: const StadiumBorder(),
          textStyle: textTheme.labelLarge!.copyWith(
            color: colorScheme.onPrimary,
            fontSize: 12.5,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.5,
            height: 1.15,
          ),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          backgroundColor: _accent,
          foregroundColor: colorScheme.onPrimary,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: const StadiumBorder(),
          textStyle: textTheme.labelLarge!.copyWith(
            color: colorScheme.onPrimary,
            fontSize: 12.5,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.5,
            height: 1.15,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: _accent,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          textStyle: textTheme.labelLarge!.copyWith(
            color: _accent,
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.4,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: _accent,
          side: BorderSide(color: colorScheme.outline),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          textStyle: textTheme.labelLarge!.copyWith(
            color: _accent,
            fontSize: 12.5,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.5,
            height: 1.15,
          ),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: GrimColors.accentAlt,
        foregroundColor: Colors.black,
        elevation: 6,
      ),
      dividerTheme: DividerThemeData(color: colorScheme.outline.withValues(alpha: 0.5), thickness: 1),
      listTileTheme: ListTileThemeData(
        iconColor: colorScheme.onSurfaceVariant,
        textColor: colorScheme.onSurface,
        tileColor: Colors.transparent,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: GrimColors.surfaceRaised,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        titleTextStyle: textTheme.titleLarge?.copyWith(color: _onSurface),
        contentTextStyle: textTheme.bodyMedium,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: const Color(0xFF1A1F28),
        contentTextStyle: textTheme.bodyMedium?.copyWith(color: _onSurface),
        behavior: SnackBarBehavior.floating,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: _accent, circularTrackColor: Color(0xFF2A3038)),
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: _accent,
        selectionColor: _accent.withValues(alpha: 0.35),
        selectionHandleColor: _accent,
      ),
    );
  }
}
