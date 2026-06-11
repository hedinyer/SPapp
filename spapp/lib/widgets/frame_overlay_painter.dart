import 'package:flutter/material.dart';
import 'package:spapp/theme/app_theme.dart';

class FrameOverlayPainter extends CustomPainter {
  FrameOverlayPainter({required this.isSelfie});

  final bool isSelfie;

  static Rect guideRect(Size size, {required bool isSelfie}) {
    return isSelfie
        ? Rect.fromCenter(
            center: Offset(size.width / 2, size.height / 2),
            width: size.width * 0.55,
            height: size.height * 0.7,
          )
        : Rect.fromLTWH(
            size.width * 0.08,
            size.height * 0.18,
            size.width * 0.84,
            size.height * 0.64,
          );
  }

  @override
  void paint(Canvas canvas, Size size) {
    final rect = guideRect(size, isSelfie: isSelfie);

    final maskPaint = Paint()..color = Colors.black.withValues(alpha: 0.45);
    final fullRect = Offset.zero & size;

    if (isSelfie) {
      canvas.saveLayer(fullRect, Paint());
      canvas.drawRect(fullRect, maskPaint);
      canvas.drawOval(
        rect,
        Paint()..blendMode = BlendMode.clear,
      );
      canvas.restore();
    } else {
      final cutout = RRect.fromRectAndRadius(rect, const Radius.circular(12));
      canvas.saveLayer(fullRect, Paint());
      canvas.drawRect(fullRect, maskPaint);
      canvas.drawRRect(
        cutout,
        Paint()..blendMode = BlendMode.clear,
      );
      canvas.restore();
    }

    final borderPaint = Paint()
      ..color = AppColors.primary.withValues(alpha: 0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final corner = Paint()
      ..color = AppColors.onPrimary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    if (isSelfie) {
      canvas.drawOval(rect, borderPaint);
    } else {
      final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(12));
      canvas.drawRRect(rrect, borderPaint);
    }

    const cornerLen = 22.0;
    final corners = [
      Offset(rect.left, rect.top),
      Offset(rect.right, rect.top),
      Offset(rect.left, rect.bottom),
      Offset(rect.right, rect.bottom),
    ];

    for (final origin in corners) {
      final isLeft = origin.dx == rect.left;
      final isTop = origin.dy == rect.top;
      canvas.drawLine(
        origin,
        origin + Offset(isLeft ? cornerLen : -cornerLen, 0),
        corner,
      );
      canvas.drawLine(
        origin,
        origin + Offset(0, isTop ? cornerLen : -cornerLen),
        corner,
      );
    }
  }

  @override
  bool shouldRepaint(covariant FrameOverlayPainter oldDelegate) {
    return oldDelegate.isSelfie != isSelfie;
  }
}
