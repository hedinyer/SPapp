import 'package:flutter/material.dart';
import 'package:spapp/models/motorcycle_pricing.dart';
import 'package:spapp/theme/app_theme.dart';

class MotorcyclePricingCompact extends StatelessWidget {
  const MotorcyclePricingCompact({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'CUOTA DIARIA',
          style: AppTypography.labelSm.copyWith(
            fontSize: 10,
            letterSpacing: 1.2,
            color: AppColors.secondary,
          ),
        ),
        Text(
          MotorcyclePricing.dailyFormatted,
          style: AppTypography.headlineSm,
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Semanal · Quincenal · Mensual',
          style: AppTypography.labelSm.copyWith(
            fontSize: 10,
            color: AppColors.primary,
            fontWeight: FontWeight.w600,
          ),
        ),
        Text(
          'Pago por adelantado',
          style: AppTypography.labelSm.copyWith(
            fontSize: 10,
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
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'FINANCIAMIENTO',
            style: AppTypography.labelSm.copyWith(
              color: Colors.white.withValues(alpha: 0.7),
              letterSpacing: 1.4,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                MotorcyclePricing.dailyFormatted,
                style: AppTypography.headlineLg.copyWith(color: Colors.white),
              ),
              const SizedBox(width: AppSpacing.xs),
              Text(
                '/ día',
                style: AppTypography.bodySm.copyWith(
                  color: Colors.white.withValues(alpha: 0.7),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            MotorcyclePricing.advanceNote,
            style: AppTypography.bodySm.copyWith(
              color: Colors.white.withValues(alpha: 0.85),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          for (var i = 1; i < MotorcyclePricing.options.length; i++) ...[
            if (i > 1) const SizedBox(height: AppSpacing.sm),
            _PaymentOptionRow(option: MotorcyclePricing.options[i]),
          ],
          if (onRequest != null) ...[
            const SizedBox(height: AppSpacing.lg),
            FilledButton(
              onPressed: onRequest,
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.primary,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
              ),
              child: const Text('Solicitar crédito'),
            ),
          ],
        ],
      ),
    );
  }
}

class _PaymentOptionRow extends StatelessWidget {
  const _PaymentOptionRow({required this.option});

  final PaymentOption option;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm + 2,
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
                    fontSize: 10,
                    letterSpacing: 1.2,
                    color: Colors.white.withValues(alpha: 0.65),
                  ),
                ),
                Text(
                  MotorcyclePricing.formatCop(option.amount),
                  style: AppTypography.labelMd.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          Text(
            option.period,
            style: AppTypography.labelSm.copyWith(
              fontSize: 10,
              color: Colors.white.withValues(alpha: 0.55),
            ),
          ),
        ],
      ),
    );
  }
}
