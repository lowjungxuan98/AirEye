import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'grim_colors.dart';
import 'grim_text_theme_utils.dart';

/// Global [ThemeData] for the GRIM mobile app (dark only).
abstract final class GrimTheme {
  static ThemeData get data {
    const scheme = ColorScheme(
      brightness: Brightness.dark,
      primary: GrimColors.accent,
      onPrimary: Color(0xFF0A0A0A),
      secondary: GrimColors.accent,
      onSecondary: Color(0xFF0A0A0A),
      surface: GrimColors.surface,
      onSurface: GrimColors.onSurface,
      onSurfaceVariant: GrimColors.muted,
      outline: GrimColors.outline,
      error: GrimColors.error,
      onError: Color(0xFF0A0A0A),
    );

    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      scaffoldBackgroundColor: GrimColors.scaffold,
    );

    final textTheme = scaleTextThemeFontSizes(
      GoogleFonts.jetBrainsMonoTextTheme(
        base.textTheme.copyWith(
          titleLarge: base.textTheme.titleLarge?.copyWith(
            color: GrimColors.onSurface,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
          titleMedium: base.textTheme.titleMedium?.copyWith(
            color: GrimColors.onSurface,
            fontWeight: FontWeight.w600,
            fontSize: 15,
          ),
          bodyLarge: base.textTheme.bodyLarge?.copyWith(color: GrimColors.onSurface, fontSize: 15),
          bodyMedium: base.textTheme.bodyMedium?.copyWith(color: GrimColors.muted, fontSize: 13),
          bodySmall: base.textTheme.bodySmall?.copyWith(color: GrimColors.muted, fontSize: 12),
          labelLarge: base.textTheme.labelLarge?.copyWith(
            color: GrimColors.onSurface,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.6,
            fontSize: 12,
          ),
        ),
      ),
      0.9,
    );

    return base.copyWith(
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        backgroundColor: GrimColors.scaffold,
        foregroundColor: GrimColors.onSurface,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: textTheme.titleLarge,
      ),
      textTheme: textTheme,
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: GrimColors.accent,
          foregroundColor: const Color(0xFF0A0A0A),
          disabledBackgroundColor: GrimColors.outline,
          disabledForegroundColor: GrimColors.muted,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: const StadiumBorder(),
          textStyle: textTheme.labelLarge!.copyWith(
            color: const Color(0xFF0A0A0A),
            fontSize: 12.5,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.5,
            height: 1.15,
          ),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: GrimColors.accent,
          foregroundColor: const Color(0xFF0A0A0A),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: const StadiumBorder(),
          textStyle: textTheme.labelLarge!.copyWith(
            color: const Color(0xFF0A0A0A),
            fontSize: 12.5,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.5,
            height: 1.15,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: GrimColors.accent,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          textStyle: textTheme.labelLarge!.copyWith(
            color: GrimColors.accent,
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.4,
          ),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: Color(0xFFDFFF4F),
        foregroundColor: Color(0xFF0A0A0A),
        elevation: 6,
      ),
      cardTheme: CardThemeData(
        color: GrimColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: GrimColors.outline),
        ),
      ),
      listTileTheme: const ListTileThemeData(iconColor: GrimColors.iconMuted, textColor: GrimColors.onSurface),
      dividerTheme: const DividerThemeData(color: GrimColors.outline, thickness: 1),
      iconTheme: const IconThemeData(color: GrimColors.onSurface, size: 24),
      dialogTheme: DialogThemeData(
        backgroundColor: const Color(0xFF1E2329),
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        titleTextStyle: textTheme.titleLarge?.copyWith(
          color: GrimColors.onSurface,
          fontSize: 16,
          fontWeight: FontWeight.w700,
        ),
        contentTextStyle: textTheme.bodyMedium?.copyWith(color: GrimColors.muted, fontSize: 13, height: 1.45),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: GrimColors.surface,
        contentTextStyle: textTheme.bodyMedium?.copyWith(color: GrimColors.onSurface),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: GrimColors.accent,
        circularTrackColor: GrimColors.outline,
      ),
    );
  }
}
