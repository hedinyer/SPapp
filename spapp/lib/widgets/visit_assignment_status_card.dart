import 'package:flutter/material.dart';
import 'package:spapp/models/visita.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';
import 'package:spapp/utils/colombia_time.dart';
import 'package:spapp/widgets/status_card_shell.dart';

class VisitAssignmentStatusCard extends StatelessWidget {
  const VisitAssignmentStatusCard({
    super.key,
    this.visita,
    this.isLoading = false,
    this.compactWhenCompleted = false,
  });

  final Visita? visita;
  final bool isLoading;
  final bool compactWhenCompleted;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const _LoadingCard();
    }

    if (visita == null) {
      return const _PendienteAsignacionCard();
    }

    return switch (visita!.estado) {
      VisitaEstado.pendienteAsignacion => _PendienteAsignacionCard(
          visita: visita!,
        ),
      VisitaEstado.asignada => _AsignadaCard(visita: visita!),
      VisitaEstado.completada => _CompletadaCard(
          visita: visita!,
          compact: compactWhenCompleted,
        ),
      VisitaEstado.cancelada => _CanceladaCard(visita: visita!),
    };
  }
}

class _LoadingCard extends StatelessWidget {
  const _LoadingCard();

  @override
  Widget build(BuildContext context) {
    return const StatusCardShell(
      icon: SizedBox(
        width: 48,
        height: 48,
        child: CircularProgressIndicator(
          strokeWidth: 2.5,
          color: AppColors.primary,
        ),
      ),
      title: 'Visita domiciliaria',
      description: 'Consultando el estado de tu visita...',
      accentColor: AppColors.primary,
    );
  }
}

class _PendienteAsignacionCard extends StatelessWidget {
  const _PendienteAsignacionCard({this.visita});

  final Visita? visita;

  @override
  Widget build(BuildContext context) {
    final address = visita?.direccionCompleta.trim();

    return StatusCardShell(
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
              Icons.home_rounded,
              size: Responsive.isCompact(context) ? 20 : 22,
              color: AppColors.primary,
            ),
          ],
        ),
      ),
      title: 'Visita domiciliaria pendiente',
      description:
          'A la espera de asignación de visita en tu domicilio. Te notificaremos cuando un visitador sea asignado.',
      footer: address?.isNotEmpty == true
          ? StatusInfoRow(
              icon: Icons.location_on_outlined,
              label: address!,
            )
          : null,
    );
  }
}

class _AsignadaCard extends StatelessWidget {
  const _AsignadaCard({required this.visita});

  final Visita visita;

  @override
  Widget build(BuildContext context) {
    final visitador = visita.visitador;
    final fecha = formatBogotaDateTime(visita.fechaProgramada);
    final direccion = visita.direccionCompleta;

    return StatusCardShell(
      accentColor: const Color(0xFF1565C0),
      icon: _VisitadorAvatar(fotoUrl: visitador?.fotoUrl),
      title: 'Visita domiciliaria programada',
      description: visitador != null
          ? '${visitador.nombre} realizará la visita en tu domicilio.'
          : 'Un visitador realizará la visita en tu domicilio.',
      footer: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (fecha.isNotEmpty)
            StatusInfoRow(
              icon: Icons.calendar_today_rounded,
              label: 'Fecha programada: $fecha',
            ),
          if (fecha.isNotEmpty && direccion.isNotEmpty)
            const SizedBox(height: AppSpacing.sm),
          if (direccion.isNotEmpty)
            StatusInfoRow(
              icon: Icons.location_on_outlined,
              label: direccion,
            ),
        ],
      ),
    );
  }
}

class _CompletadaCard extends StatelessWidget {
  const _CompletadaCard({required this.visita, this.compact = false});

  final Visita visita;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final fecha = formatBogotaDateTime(visita.fechaProgramada);
    final direccion = visita.direccionCompleta;

    if (compact) {
      return StatusCardShell(
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
        title: 'Visita completada',
        description: 'La visita domiciliaria fue realizada correctamente.',
      );
    }

    return StatusCardShell(
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
      title: 'Visita domiciliaria completada',
      description:
          'La visita en tu domicilio fue realizada. Gracias por completar '
          'este paso del proceso.',
      footer: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (fecha.isNotEmpty)
            StatusInfoRow(
              icon: Icons.event_available_rounded,
              label: 'Visita realizada: $fecha',
            ),
          if (fecha.isNotEmpty && direccion.isNotEmpty)
            const SizedBox(height: AppSpacing.sm),
          if (direccion.isNotEmpty)
            StatusInfoRow(
              icon: Icons.location_on_outlined,
              label: direccion,
            ),
        ],
      ),
    );
  }
}

class _CanceladaCard extends StatelessWidget {
  const _CanceladaCard({required this.visita});

  final Visita visita;

  @override
  Widget build(BuildContext context) {
    final direccion = visita.direccionCompleta;
    final notas = visita.notas?.trim();

    return StatusCardShell(
      accentColor: AppColors.error,
      icon: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: AppColors.errorContainer,
          borderRadius: BorderRadius.circular(AppRadius.xl),
        ),
        child: const Icon(
          Icons.event_busy_rounded,
          color: AppColors.onErrorContainer,
        ),
      ),
      title: 'Visita domiciliaria cancelada',
      description:
          'La visita programada fue cancelada. Contacta al concesionario para más información.',
      footer: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (notas?.isNotEmpty == true)
            StatusInfoRow(
              icon: Icons.info_outline_rounded,
              label: notas!,
            ),
          if (notas?.isNotEmpty == true && direccion.isNotEmpty)
            const SizedBox(height: AppSpacing.sm),
          if (direccion.isNotEmpty)
            StatusInfoRow(
              icon: Icons.location_on_outlined,
              label: direccion,
            ),
        ],
      ),
    );
  }
}

class _VisitadorAvatar extends StatelessWidget {
  const _VisitadorAvatar({this.fotoUrl});

  final String? fotoUrl;

  @override
  Widget build(BuildContext context) {
    final url = fotoUrl?.trim();

    if (url != null && url.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(AppRadius.xl),
        child: Image.network(
          url,
          width: 48,
          height: 48,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => _placeholder(),
        ),
      );
    }

    return _placeholder();
  }

  Widget _placeholder() {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: const Color(0xFFE3F2FD),
        borderRadius: BorderRadius.circular(AppRadius.xl),
      ),
      child: const Icon(
        Icons.person_rounded,
        color: Color(0xFF1565C0),
      ),
    );
  }
}
