import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:spapp/theme/app_theme.dart';

/// Control +/- con estilo limpio (inspirado en shadcn).
class QuantityStepper extends StatelessWidget {
  const QuantityStepper({
    super.key,
    required this.quantity,
    required this.onIncrement,
    required this.onDecrement,
    this.min = 0,
    this.max,
    this.compact = false,
  });

  final int quantity;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;
  final int min;
  final int? max;
  final bool compact;

  bool get _canDecrement => quantity > min;
  bool get _canIncrement => max == null || quantity < max!;

  @override
  Widget build(BuildContext context) {
    final buttonSize = compact ? 32.0 : 36.0;
    final iconSize = compact ? 16.0 : 18.0;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _StepperButton(
            icon: Icons.remove_rounded,
            size: buttonSize,
            iconSize: iconSize,
            enabled: _canDecrement,
            onTap: () {
              HapticFeedback.lightImpact();
              onDecrement();
            },
          ),
          AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            width: compact ? 36 : 40,
            alignment: Alignment.center,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 180),
              transitionBuilder: (child, animation) => ScaleTransition(
                scale: animation,
                child: child,
              ),
              child: Text(
                '$quantity',
                key: ValueKey<int>(quantity),
                style: AppTypography.labelMd.copyWith(
                  fontWeight: FontWeight.w600,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ),
          _StepperButton(
            icon: Icons.add_rounded,
            size: buttonSize,
            iconSize: iconSize,
            enabled: _canIncrement,
            onTap: () {
              HapticFeedback.lightImpact();
              onIncrement();
            },
          ),
        ],
      ),
    );
  }
}

class _StepperButton extends StatelessWidget {
  const _StepperButton({
    required this.icon,
    required this.size,
    required this.iconSize,
    required this.enabled,
    required this.onTap,
  });

  final IconData icon;
  final double size;
  final double iconSize;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: SizedBox(
          width: size,
          height: size,
          child: Icon(
            icon,
            size: iconSize,
            color: enabled ? AppColors.onSurface : AppColors.outlineVariant,
          ),
        ),
      ),
    );
  }
}
