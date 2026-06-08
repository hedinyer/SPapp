import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Paleta Material 3 del diseño de referencia.
abstract final class AppColors {
  static const background = Color(0xFFFCF8FA);
  static const surface = Color(0xFFFCF8FA);
  static const surfaceVariant = Color(0xFFE4E2E4);
  static const surfaceContainer = Color(0xFFF0EDEF);
  static const surfaceContainerLowest = Color(0xFFFFFFFF);
  static const surfaceContainerLow = Color(0xFFF6F3F5);
  static const surfaceContainerHigh = Color(0xFFEAE7E9);
  static const onSurface = Color(0xFF1B1B1D);
  static const onSurfaceVariant = Color(0xFF45464D);
  static const outline = Color(0xFF76777D);
  static const outlineVariant = Color(0xFFC6C6CD);
  static const primary = Color(0xFF000000);
  static const onPrimary = Color(0xFFFFFFFF);
  static const primaryContainer = Color(0xFF131B2E);
  static const primaryFixedDim = Color(0xFFBEC6E0);
  static const secondary = Color(0xFF5C5F61);
  static const surfaceTint = Color(0xFF565E74);
  static const inverseSurface = Color(0xFF303032);
  static const error = Color(0xFFBA1A1A);
  static const errorContainer = Color(0xFFFFDAD6);
  static const onErrorContainer = Color(0xFF93000A);
}

abstract final class AppSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const xl = 32.0;
  static const xxl = 48.0;
  static const xxxl = 64.0;
  static const containerMax = 1200.0;
}

abstract final class AppRadius {
  static const sm = 6.0;
  static const lg = 8.0;
  static const xl = 12.0;
  static const xxl = 16.0;
  static const full = 999.0;
}

abstract final class AppShadows {
  static List<BoxShadow> get subtle => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.04),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> get elevated => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.08),
          blurRadius: 40,
          offset: const Offset(0, 16),
        ),
      ];

  static List<BoxShadow> get card => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.12),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> get ctaGlow => [
        BoxShadow(
          color: Colors.white.withValues(alpha: 0.2),
          blurRadius: 40,
          spreadRadius: 0,
        ),
      ];
}

TextStyle _geist({
  required double size,
  required double height,
  FontWeight weight = FontWeight.w400,
  double? letterSpacing,
  Color color = AppColors.onSurface,
}) {
  return GoogleFonts.dmSans(
    fontSize: size,
    height: height / size,
    fontWeight: weight,
    letterSpacing: letterSpacing,
    color: color,
  );
}

abstract final class AppTypography {
  static TextStyle get eyebrow => _geist(
        size: 11,
        height: 16,
        weight: FontWeight.w500,
        letterSpacing: 2.4,
        color: AppColors.onSurfaceVariant,
      );

  static TextStyle get wordmark => _geist(
        size: 20,
        height: 24,
        weight: FontWeight.w700,
        letterSpacing: -0.8,
        color: AppColors.onPrimary,
      );

  static TextStyle get display => _geist(
        size: 40,
        height: 40,
        weight: FontWeight.w700,
        letterSpacing: -1.6,
        color: AppColors.onPrimary,
      );

  static TextStyle displayResponsive(double width) => _geist(
        size: width >= 768 ? 64 : 40,
        height: width >= 768 ? 64 : 40,
        weight: FontWeight.w700,
        letterSpacing: width >= 768 ? -2.56 : -1.6,
        color: AppColors.onPrimary,
      );

  static TextStyle headlineLgResponsive(double width) => _geist(
        size: width >= 768 ? 48 : 36,
        height: width >= 768 ? 48 : 40,
        weight: FontWeight.w600,
        letterSpacing: width >= 768 ? -0.96 : -0.72,
        color: AppColors.onSurface,
      );

  static TextStyle get headlineLg => _geist(
        size: 36,
        height: 40,
        weight: FontWeight.w600,
        letterSpacing: -0.72,
        color: AppColors.onSurface,
      );

  static TextStyle get headlineMd => _geist(
        size: 28,
        height: 36,
        weight: FontWeight.w600,
        letterSpacing: -0.28,
        color: AppColors.onSurface,
      );

  static TextStyle get headlineSm => _geist(
        size: 17,
        height: 24,
        weight: FontWeight.w600,
        letterSpacing: -0.2,
        color: AppColors.onSurface,
      );

  static TextStyle get stepNumber => _geist(
        size: 48,
        height: 52,
        weight: FontWeight.w300,
        letterSpacing: -2,
        color: AppColors.outlineVariant,
      );

  static TextStyle get headlineLgMobile => _geist(
        size: 24,
        height: 32,
        weight: FontWeight.w600,
        color: AppColors.onSurface,
      );

  static TextStyle get bodyLg => _geist(
        size: 18,
        height: 28,
        weight: FontWeight.w400,
        color: AppColors.secondary,
      );

  static TextStyle get navLink => _geist(
        size: 12,
        height: 16,
        weight: FontWeight.w500,
        letterSpacing: 1.8,
        color: AppColors.onPrimary,
      );

  static TextStyle get stepLabel => _geist(
        size: 12,
        height: 16,
        weight: FontWeight.w400,
        letterSpacing: 0,
        color: AppColors.secondary,
      );

  static TextStyle get bodySm => _geist(
        size: 14,
        height: 22,
        weight: FontWeight.w400,
        color: AppColors.onSurfaceVariant,
      );

  static TextStyle get bodyMd => _geist(
        size: 16,
        height: 24,
        color: AppColors.onSurface,
      );

  static TextStyle get labelSm => _geist(
        size: 12,
        height: 16,
        weight: FontWeight.w500,
        letterSpacing: 0.05 * 12,
        color: AppColors.onSurface,
      );

  static TextStyle get labelMd => _geist(
        size: 14,
        height: 20,
        weight: FontWeight.w500,
        color: AppColors.onSurface,
      );

  static TextStyle get labelMdPrimary => labelMd.copyWith(color: AppColors.primary);
}

ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: AppColors.surfaceContainerLowest,
    colorScheme: const ColorScheme.light(
      surface: AppColors.surfaceContainerLowest,
      onSurface: AppColors.onSurface,
      primary: AppColors.primary,
      onPrimary: AppColors.onPrimary,
      error: AppColors.error,
      outline: AppColors.outlineVariant,
    ),
    textTheme: GoogleFonts.dmSansTextTheme(),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surfaceContainerLowest,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm + 2,
      ),
      hintStyle: AppTypography.bodyMd.copyWith(
        color: AppColors.outline.withValues(alpha: 0.5),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        borderSide: const BorderSide(color: AppColors.outlineVariant),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        borderSide: const BorderSide(color: AppColors.outlineVariant),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        borderSide: const BorderSide(color: AppColors.error),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        borderSide: const BorderSide(color: AppColors.error, width: 2),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.onPrimary,
        disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.6),
        disabledForegroundColor: AppColors.onPrimary,
        minimumSize: const Size.fromHeight(42),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: 10,
        ),
        elevation: 0,
        shadowColor: Colors.black.withValues(alpha: 0.05),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
        ),
        textStyle: AppTypography.labelMd.copyWith(color: AppColors.onPrimary),
      ),
    ),
  );
}
