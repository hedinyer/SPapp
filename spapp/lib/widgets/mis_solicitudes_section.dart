import 'package:flutter/material.dart';
import 'package:spapp/models/moto_payment_calculator.dart';
import 'package:spapp/models/solicitud_taller.dart';
import 'package:spapp/screens/solicitud_taller_detail_screen.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';
import 'package:spapp/utils/colombia_time.dart';

class MisSolicitudesSection extends StatelessWidget {
  const MisSolicitudesSection({
    super.key,
    required this.solicitudes,
    this.isLoading = false,
  });

  final List<SolicitudTaller> solicitudes;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Padding(
        padding: EdgeInsets.only(top: AppSpacing.xl),
        child: Center(
          child: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2.5),
          ),
        ),
      );
    }

    if (solicitudes.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: AppSpacing.xl),
        Text(
          'Mis solicitudes',
          style: AppTypography.headlineLgMobile.copyWith(
            fontSize: Responsive.lerp(context, min: 18, max: 22),
            color: AppColors.onSurface,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        ...solicitudes.map(
          (solicitud) => Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: _SolicitudTile(solicitud: solicitud),
          ),
        ),
      ],
    );
  }
}

class _SolicitudTile extends StatelessWidget {
  const _SolicitudTile({required this.solicitud});

  final SolicitudTaller solicitud;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = switch (solicitud.tipo) {
      SolicitudTallerTipo.repuestos => (
          Icons.build_circle_outlined,
          const Color(0xFF1565C0),
        ),
      SolicitudTallerTipo.reparacion => (
          Icons.handyman_outlined,
          const Color(0xFFE65100),
        ),
      SolicitudTallerTipo.cambioAceite => (
          Icons.oil_barrel_outlined,
          const Color(0xFF1B7A3D),
        ),
    };

    return Material(
      color: AppColors.background,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => SolicitudTallerDetailScreen(solicitud: solicitud),
          ),
        ),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: color.withValues(alpha: 0.2)),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AppRadius.xl),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      solicitud.tipo.label,
                      style: AppTypography.labelMd.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      _subtitle(solicitud),
                      style: AppTypography.bodySm.copyWith(
                        color: AppColors.secondary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      formatBogotaDateTime(solicitud.createdAt),
                      style: AppTypography.bodySm.copyWith(
                        color: AppColors.secondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              _EstadoChip(estado: solicitud.estado),
              const SizedBox(width: AppSpacing.xs),
              Icon(Icons.chevron_right_rounded, color: AppColors.secondary),
            ],
          ),
        ),
      ),
    );
  }

  String _subtitle(SolicitudTaller solicitud) {
    return switch (solicitud.tipo) {
      SolicitudTallerTipo.repuestos =>
        'Total: ${MotoPaymentCalculator.formatCop(solicitud.totalEstimado)}',
      SolicitudTallerTipo.reparacion =>
        solicitud.descripcionFalla?.trim().isNotEmpty == true
            ? solicitud.descripcionFalla!.trim()
            : 'Solicitud de reparación',
      SolicitudTallerTipo.cambioAceite =>
        solicitud.fechaPreferida != null
            ? 'Fecha: ${_formatDate(solicitud.fechaPreferida!)}'
            : 'Cambio de aceite programado',
    };
  }

  String _formatDate(DateTime date) {
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    return '$day/$month/${date.year}';
  }
}

class _EstadoChip extends StatelessWidget {
  const _EstadoChip({required this.estado});

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
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        estado.label,
        style: AppTypography.labelSm.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

