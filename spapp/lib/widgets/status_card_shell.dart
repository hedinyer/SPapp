import 'package:flutter/material.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';

class StatusCardShell extends StatelessWidget {
  const StatusCardShell({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    this.footer,
    this.accentColor,
    this.action,
  });

  final Widget icon;
  final String title;
  final String description;
  final Widget? footer;
  final Color? accentColor;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final width = Responsive.width(context);

    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(
        Responsive.lerp(context, min: AppSpacing.lg, max: AppSpacing.xl),
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(
          Responsive.lerp(context, min: AppRadius.xl, max: AppRadius.xxl),
        ),
        border: Border.all(
          color: accentColor?.withValues(alpha: 0.2) ?? AppColors.outlineVariant,
        ),
        boxShadow: AppShadows.subtle,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              icon,
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: AppTypography.headlineMdResponsive(width).copyWith(
                        fontSize: Responsive.isCompact(context) ? 18 : 22,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      description,
                      style: AppTypography.bodyMd.copyWith(
                        color: AppColors.secondary,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (footer != null) ...[
            const SizedBox(height: AppSpacing.lg),
            footer!,
          ],
          if (action != null) ...[
            const SizedBox(height: AppSpacing.lg),
            action!,
          ],
        ],
      ),
    );
  }
}

class StatusInfoRow extends StatelessWidget {
  const StatusInfoRow({super.key, required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: 16, color: AppColors.secondary),
        ),
        const SizedBox(width: AppSpacing.xs),
        Expanded(
          child: Text(
            label,
            style: AppTypography.bodySm.copyWith(
              color: AppColors.secondary,
              height: 1.4,
            ),
          ),
        ),
      ],
    );
  }
}
