import 'package:flutter/material.dart';
import 'package:spapp/models/motorcycle_pricing.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';

class MotorcyclePricingCompact extends StatelessWidget {
  const MotorcyclePricingCompact({super.key});

  @override
  Widget build(BuildContext context) {
    final compact = Responsive.isCompact(context);
    final labelSize = compact ? 9.0 : 10.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'CUOTA DIARIA',
          style: AppTypography.labelSm.copyWith(
            fontSize: labelSize,
            letterSpacing: 1.2,
            color: AppColors.secondary,
          ),
        ),
        Text(
          MotorcyclePricing.dailyFormatted,
          style: AppTypography.headlineSm.copyWith(
            fontSize: compact ? 15 : 17,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Semanal · Quincenal · Mensual',
          style: AppTypography.labelSm.copyWith(
            fontSize: labelSize,
            color: AppColors.primary,
            fontWeight: FontWeight.w600,
          ),
        ),
        Text(
          'Pago por adelantado',
          style: AppTypography.labelSm.copyWith(
            fontSize: labelSize,
            color: AppColors.secondary,
          ),
        ),
      ],
    );
  }
}

class MotorcyclePricingExpanded extends StatelessWidget {
  const MotorcyclePricingExpanded({
    super.key,
    this.onRequest,
  });

  final VoidCallback? onRequest;

  @override
  Widget build(BuildContext context) {
    final width = Responsive.width(context);
    final compact = Responsive.isCompact(context);
    final cardPad = Responsive.lerp(
      context,
      min: AppSpacing.md,
      max: AppSpacing.lg,
    );

    return Container(
      padding: EdgeInsets.all(cardPad),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(
          Responsive.lerp(context, min: AppRadius.xl, max: AppRadius.xxl),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'FINANCIAMIENTO',
            style: AppTypography.labelSm.copyWith(
              color: Colors.white.withValues(alpha: 0.7),
              letterSpacing: 1.4,
              fontSize: compact ? 11 : 12,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.end,
            spacing: AppSpacing.xs,
            children: [
              Text(
                MotorcyclePricing.dailyFormatted,
                style: AppTypography.headlineLgResponsive(width).copyWith(
                  color: Colors.white,
                ),
              ),
              Text(
                '/ día',
                style: AppTypography.bodySm.copyWith(
                  color: Colors.white.withValues(alpha: 0.7),
                  fontSize: compact ? 12 : 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            MotorcyclePricing.advanceNote,
            style: AppTypography.bodySm.copyWith(
              color: Colors.white.withValues(alpha: 0.85),
              fontSize: compact ? 12 : 14,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          for (var i = 1; i < MotorcyclePricing.options.length; i++) ...[
            if (i > 1) const SizedBox(height: AppSpacing.sm),
            _PaymentOptionRow(
              option: MotorcyclePricing.options[i],
              compact: compact,
            ),
          ],
          if (onRequest != null) ...[
            const SizedBox(height: AppSpacing.lg),
            FilledButton(
              onPressed: onRequest,
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.primary,
                minimumSize: Size(
                  double.infinity,
                  compact ? 44 : 48,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
              ),
              child: Text(
                'Solicitar crédito',
                style: AppTypography.labelMd.copyWith(
                  color: AppColors.primary,
                  fontSize: compact ? 13 : 14,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PaymentOptionRow extends StatelessWidget {
  const _PaymentOptionRow({
    required this.option,
    this.compact = false,
  });

  final PaymentOption option;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? AppSpacing.sm + 4 : AppSpacing.md,
        vertical: compact ? AppSpacing.sm : AppSpacing.sm + 2,
      ),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  option.label.toUpperCase(),
                  style: AppTypography.labelSm.copyWith(
                    fontSize: compact ? 9 : 10,
                    letterSpacing: 1.2,
                    color: Colors.white.withValues(alpha: 0.65),
                  ),
                ),
                Text(
                  MotorcyclePricing.formatCop(option.amount),
                  style: AppTypography.labelMd.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: compact ? 13 : 14,
                  ),
                ),
              ],
            ),
          ),
          Text(
            option.period,
            style: AppTypography.labelSm.copyWith(
              fontSize: compact ? 9 : 10,
              color: Colors.white.withValues(alpha: 0.55),
            ),
          ),
        ],
      ),
    );
  }
}
