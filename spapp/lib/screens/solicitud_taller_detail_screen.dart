import 'package:flutter/material.dart';
import 'package:spapp/models/moto_payment_calculator.dart';
import 'package:spapp/models/solicitud_taller.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';
import 'package:spapp/utils/colombia_time.dart';

class SolicitudTallerDetailScreen extends StatelessWidget {
  const SolicitudTallerDetailScreen({
    super.key,
    required this.solicitud,
  });

  final SolicitudTaller solicitud;

  @override
  Widget build(BuildContext context) {
    final horizontalPad = Responsive.horizontalPadding(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(
          solicitud.tipo.label,
          style: AppTypography.headlineSm.copyWith(
            color: AppColors.onSurface,
          ),
        ),
      ),
      body: ListView(
        padding: EdgeInsets.fromLTRB(
          horizontalPad,
          AppSpacing.md,
          horizontalPad,
          AppSpacing.xxxl,
        ),
        children: [
          _EstadoBadge(estado: solicitud.estado),
          const SizedBox(height: AppSpacing.lg),
          _DetailRow(
            label: 'Creada',
            value: formatBogotaDateTime(solicitud.createdAt),
          ),
          if (solicitud.updatedAt != null)
            _DetailRow(
              label: 'Actualizada',
              value: formatBogotaDateTime(solicitud.updatedAt),
            ),
          if (solicitud.fechaPreferida != null)
            _DetailRow(
              label: 'Fecha preferida',
              value: _formatDate(solicitud.fechaPreferida!),
            ),
          if (solicitud.tipo == SolicitudTallerTipo.repuestos)
            _DetailRow(
              label: 'Total estimado',
              value: MotoPaymentCalculator.formatCop(solicitud.totalEstimado),
            ),
          if (solicitud.descripcionFalla != null &&
              solicitud.descripcionFalla!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            _TextBlock(
              title: 'Descripción de la falla',
              body: solicitud.descripcionFalla!,
            ),
          ],
          if (solicitud.notasCliente != null &&
              solicitud.notasCliente!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            _TextBlock(
              title: 'Tus notas',
              body: solicitud.notasCliente!,
            ),
          ],
          if (solicitud.notasAdmin != null &&
              solicitud.notasAdmin!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            _TextBlock(
              title: 'Notas del taller',
              body: solicitud.notasAdmin!,
              accent: AppColors.primary,
            ),
          ],
          if (solicitud.tipo == SolicitudTallerTipo.repuestos &&
              solicitud.repuestoItems.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Productos solicitados',
              style: AppTypography.labelMd.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            ...solicitud.repuestoItems.map(
              (item) => Container(
                margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.surfaceContainerLowest,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: AppColors.outlineVariant),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.nombre,
                            style: AppTypography.labelMd.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            'Cantidad: ${item.cantidad}',
                            style: AppTypography.bodySm.copyWith(
                              color: AppColors.secondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      MotoPaymentCalculator.formatCop(item.subtotal),
                      style: AppTypography.labelMd.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    return '$day/$month/${date.year}';
  }
}

class _EstadoBadge extends StatelessWidget {
  const _EstadoBadge({required this.estado});

  final SolicitudTallerEstado estado;

  @override
  Widget build(BuildContext context) {
    final (color, bg) = switch (estado) {
      SolicitudTallerEstado.pendiente => (
          const Color(0xFF1565C0),
          const Color(0xFFE3F2FD),
        ),
      SolicitudTallerEstado.enProceso => (
          const Color(0xFFE65100),
          const Color(0xFFFFF3E0),
        ),
      SolicitudTallerEstado.completada => (
          const Color(0xFF1B7A3D),
          const Color(0xFFE8F5E9),
        ),
      SolicitudTallerEstado.cancelada => (
          AppColors.secondary,
          AppColors.surfaceContainerHigh,
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        estado.label,
        style: AppTypography.labelMd.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: AppTypography.bodySm.copyWith(color: AppColors.secondary),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: AppTypography.bodySm.copyWith(
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TextBlock extends StatelessWidget {
  const _TextBlock({
    required this.title,
    required this.body,
    this.accent,
  });

  final String title;
  final String body;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: accent?.withValues(alpha: 0.2) ?? AppColors.outlineVariant,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: AppTypography.labelMd.copyWith(
              fontWeight: FontWeight.w600,
              color: accent,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            body,
            style: AppTypography.bodySm.copyWith(color: AppColors.onSurface),
          ),
        ],
      ),
    );
  }
}

