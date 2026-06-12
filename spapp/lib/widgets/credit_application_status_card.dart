import 'package:flutter/material.dart';
import 'package:spapp/models/digital_contract.dart';
import 'package:spapp/models/user_document.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';
import 'package:spapp/utils/colombia_time.dart';

class CreditApplicationStatusCard extends StatelessWidget {
  const CreditApplicationStatusCard({
    super.key,
    required this.document,
    this.onDiligenciarFormatos,
    this.contractStatus,
  });

  final UserDocument document;
  final VoidCallback? onDiligenciarFormatos;
  final ContractFormStatus? contractStatus;

  @override
  Widget build(BuildContext context) {
    return switch (document.estadoSolicitud) {
      SolicitudEstado.pendiente => _PendingCard(),
      SolicitudEstado.rechazada => _RejectedCard(document: document),
      SolicitudEstado.aceptada => _AcceptedCard(
          onDiligenciarFormatos: onDiligenciarFormatos,
          contractStatus: contractStatus,
        ),
    };
  }
}

class _StatusCardShell extends StatelessWidget {
  const _StatusCardShell({
    required this.icon,
    required this.title,
    required this.description,
    this.footer,
    this.accentColor,
  });

  final Widget icon;
  final String title;
  final String description;
  final Widget? footer;
  final Color? accentColor;

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
        ],
      ),
    );
  }
}

class _PendingCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return _StatusCardShell(
      accentColor: AppColors.primary,
      icon: SizedBox(
        width: 48,
        height: 48,
        child: Stack(
          alignment: Alignment.center,
          children: [
            const SizedBox(
              width: 48,
              height: 48,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: AppColors.primary,
              ),
            ),
            Icon(
              Icons.schedule_rounded,
              size: Responsive.isCompact(context) ? 20 : 22,
              color: AppColors.primary,
            ),
          ],
        ),
      ),
      title: 'Tu solicitud está en proceso',
      description:
          'Estamos revisando tu información. En unas horas recibirás una notificación y podrás ver el estado de tu solicitud de crédito desde esta app.',
    );
  }
}

class _RejectedCard extends StatelessWidget {
  const _RejectedCard({required this.document});

  final UserDocument document;

  @override
  Widget build(BuildContext context) {
    final motivo = document.motivoRechazo?.trim();
    final hora = formatBogotaDateTime(document.horaActualizacion);

    return _StatusCardShell(
      accentColor: AppColors.error,
      icon: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: AppColors.errorContainer,
          borderRadius: BorderRadius.circular(AppRadius.xl),
        ),
        child: const Icon(
          Icons.cancel_outlined,
          color: AppColors.onErrorContainer,
        ),
      ),
      title: 'Solicitud rechazada',
      description: motivo?.isNotEmpty == true
          ? motivo!
          : 'Tu solicitud no fue aprobada. Contacta al concesionario para más información.',
      footer: hora.isNotEmpty
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(top: 2),
                  child: Icon(
                    Icons.access_time_rounded,
                    size: 16,
                    color: AppColors.secondary,
                  ),
                ),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    'Actualizado: $hora',
                    style: AppTypography.bodySm.copyWith(
                      color: AppColors.secondary,
                    ),
                  ),
                ),
              ],
            )
          : null,
    );
  }
}

class _AcceptedCard extends StatelessWidget {
  const _AcceptedCard({
    this.onDiligenciarFormatos,
    this.contractStatus,
  });

  final VoidCallback? onDiligenciarFormatos;
  final ContractFormStatus? contractStatus;

  @override
  Widget build(BuildContext context) {
    final isSigned = contractStatus == ContractFormStatus.firmado;

    return _StatusCardShell(
      accentColor: const Color(0xFF1B7A3D),
      icon: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: const Color(0xFFE8F5E9),
          borderRadius: BorderRadius.circular(AppRadius.xl),
        ),
        child: const Icon(
          Icons.check_circle_rounded,
          color: Color(0xFF1B7A3D),
        ),
      ),
      title: '¡El proceso ha sido exitoso! :)',
      description: isSigned
          ? 'Tu solicitud fue aprobada y ya completaste tus formatos. Pronto podrás retirar tu moto.'
          : 'Tu solicitud de crédito fue aprobada. Completa tus formatos para continuar con el retiro de tu moto.',
      footer: isSigned
          ? Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5E9),
                borderRadius: BorderRadius.circular(AppRadius.lg),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.assignment_turned_in_rounded,
                    size: 18,
                    color: Color(0xFF1B7A3D),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    'Formatos completados',
                    style: AppTypography.labelMd.copyWith(
                      color: const Color(0xFF1B7A3D),
                    ),
                  ),
                ],
              ),
            )
          : onDiligenciarFormatos != null
              ? SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: onDiligenciarFormatos,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF1B7A3D),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        vertical: AppSpacing.md,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadius.full),
                      ),
                    ),
                    child: const Text(
                      'Diligenciar formatos: datos personales y contrato',
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : null,
    );
  }
}
