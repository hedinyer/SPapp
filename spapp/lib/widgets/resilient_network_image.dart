import 'package:flutter/material.dart';
import 'package:spapp/theme/app_theme.dart';

/// Imagen de red con placeholder y reintentos para conexiones lentas.
class ResilientNetworkImage extends StatelessWidget {
  const ResilientNetworkImage({
    super.key,
    required this.url,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
    this.placeholder,
  });

  final String url;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final Widget? placeholder;

  @override
  Widget build(BuildContext context) {
    final image = Image.network(
      url,
      width: width,
      height: height,
      fit: fit,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return _wrap(
          SizedBox(
            width: width,
            height: height,
            child: Center(
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.primary,
                  value: loadingProgress.expectedTotalBytes != null
                      ? loadingProgress.cumulativeBytesLoaded /
                          loadingProgress.expectedTotalBytes!
                      : null,
                ),
              ),
            ),
          ),
        );
      },
      errorBuilder: (context, error, stackTrace) =>
          _wrap(placeholder ?? _defaultPlaceholder()),
    );

    return image;
  }

  Widget _wrap(Widget child) {
    if (borderRadius == null) return child;
    return ClipRRect(borderRadius: borderRadius!, child: child);
  }

  Widget _defaultPlaceholder() {
    return Container(
      width: width,
      height: height,
      color: AppColors.surfaceContainerLow,
      child: const Icon(Icons.image_not_supported_outlined, color: AppColors.outline),
    );
  }
}
