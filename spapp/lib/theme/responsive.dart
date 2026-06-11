import 'package:flutter/material.dart';
import 'package:spapp/theme/app_theme.dart';

/// Breakpoints pensados para móviles compactos (Galaxy A), medianos (iPhone 11)
/// y grandes (Galaxy S/Ultra).
abstract final class Breakpoints {
  static const compact = 360.0;
  static const medium = 390.0;
  static const large = 428.0;
  static const tablet = 768.0;
}

abstract final class Responsive {
  static Size size(BuildContext context) => MediaQuery.sizeOf(context);

  static double width(BuildContext context) => size(context).width;

  static double height(BuildContext context) => size(context).height;

  static bool isCompact(BuildContext context) =>
      width(context) < Breakpoints.compact;

  static bool isMedium(BuildContext context) {
    final w = width(context);
    return w >= Breakpoints.compact && w < Breakpoints.large;
  }

  static bool isLargePhone(BuildContext context) =>
      width(context) >= Breakpoints.large;

  static bool isTablet(BuildContext context) =>
      width(context) >= Breakpoints.tablet;

  /// Escala lineal entre [minWidth] y [maxWidth] con límites opcionales.
  static double lerp(
    BuildContext context, {
    required double min,
    required double max,
    double minWidth = 320,
    double maxWidth = 428,
  }) {
    final w = width(context).clamp(minWidth, maxWidth);
    final t = (w - minWidth) / (maxWidth - minWidth);
    return min + (max - min) * t;
  }

  static double horizontalPadding(BuildContext context) {
    if (isTablet(context)) return AppSpacing.xxl;
    if (isCompact(context)) return AppSpacing.sm + 4;
    return AppSpacing.md;
  }

  static double contentMaxWidth(BuildContext context) {
    if (isTablet(context)) return AppSpacing.containerMax;
    return width(context);
  }

  static double logoHeight(BuildContext context) =>
      lerp(context, min: 56, max: 88);

  static double loginLogoHeight(BuildContext context) =>
      lerp(context, min: 64, max: 96);

  static double galleryHeight(BuildContext context) {
    final h = height(context);
    final top = MediaQuery.paddingOf(context).top;
    return (h * 0.36).clamp(260, 420) + top;
  }

  static int gridColumns(BuildContext context, {int tablet = 2}) {
    if (isTablet(context)) return tablet;
    return width(context) >= 520 ? 2 : 1;
  }

  /// Altura de imagen dentro de una tarjeta de moto según su ancho disponible.
  static double modelCardImageHeight(BuildContext context, double cardWidth) {
    return (cardWidth * 0.55).clamp(140.0, 220.0);
  }

  /// Altura total de una tarjeta de moto (imagen + info) sin depender de aspectRatio.
  static double modelCardExtent(BuildContext context, double maxWidth) {
    final cols = gridColumns(context);
    final spacing = lerp(context, min: AppSpacing.md, max: AppSpacing.xl);
    final cardWidth = cols == 1
        ? maxWidth
        : (maxWidth - spacing) / 2;
    final imageHeight = modelCardImageHeight(context, cardWidth);
    final infoHeight = isCompact(context) ? 230.0 : 220.0;
    return imageHeight + infoHeight;
  }

  /// Ancho de cada celda en un grid de 1 o 2 columnas con [spacing] entre items.
  static double gridItemWidth(
    BuildContext context, {
    required double maxWidth,
    required int columns,
    double spacing = AppSpacing.sm,
  }) {
    if (columns <= 1) return maxWidth;
    return (maxWidth - spacing * (columns - 1)) / columns;
  }

  static int specGridColumns(double maxWidth) => maxWidth >= 320 ? 2 : 1;

  static EdgeInsets pagePadding(BuildContext context) {
    final h = horizontalPadding(context);
    return EdgeInsets.symmetric(horizontal: h);
  }

  static EdgeInsets scrollPadding(BuildContext context) {
    final h = horizontalPadding(context);
    final bottom = MediaQuery.paddingOf(context).bottom;
    return EdgeInsets.fromLTRB(h, AppSpacing.lg, h, AppSpacing.xxxl + bottom);
  }
}

/// Limita el escalado de texto del sistema para mantener el layout en móviles.
class ResponsiveScope extends StatelessWidget {
  const ResponsiveScope({
    super.key,
    required this.child,
    this.maxScale = 1.15,
  });

  final Widget child;
  final double maxScale;

  @override
  Widget build(BuildContext context) {
    final scaler = MediaQuery.textScalerOf(context);
    return MediaQuery(
      data: MediaQuery.of(context).copyWith(
        textScaler: scaler.clamp(maxScaleFactor: maxScale),
      ),
      child: child,
    );
  }
}
