import 'package:flutter/material.dart';
import 'package:spapp/models/moto_payment_calculator.dart';
import 'package:spapp/models/user_moto_compra.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';
import 'package:spapp/widgets/moto_owner_card.dart';
import 'package:spapp/widgets/status_card_shell.dart';

class MotoPurchaseStatusCard extends StatelessWidget {
  const MotoPurchaseStatusCard({
    super.key,
    this.compra,
    this.isLoading = false,
    this.onSelectMoto,
    this.userId,
    this.username,
  });

  final UserMotoCompra? compra;
  final bool isLoading;
  final VoidCallback? onSelectMoto;
  final int? userId;
  final String? username;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const _LoadingCard();
    }

    if (compra == null) {
      return _SelectMotoCtaCard(onSelectMoto: onSelectMoto);
    }

    return switch (compra!.estado) {
      MotoCompraEstado.pendientePago => _PendingPaymentCard(compra: compra!),
      MotoCompraEstado.listaRetiro => _ReadyForPickupCard(compra: compra!),
      MotoCompraEstado.entregada => userId != null
          ? MotoOwnerCard(
              compra: compra!,
              userId: userId!,
              username: username,
            )
          : _DeliveredCard(compra: compra!),
      MotoCompraEstado.cancelada => _CancelledCard(compra: compra!),
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
      title: 'Tu moto',
      description: 'Consultando el estado de tu selección...',
      accentColor: AppColors.primary,
    );
  }
}

class _SelectMotoCtaCard extends StatefulWidget {
  const _SelectMotoCtaCard({this.onSelectMoto});

  final VoidCallback? onSelectMoto;

  @override
  State<_SelectMotoCtaCard> createState() => _SelectMotoCtaCardState();
}

class _SelectMotoCtaCardState extends State<_SelectMotoCtaCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.08).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const accent = Color(0xFFE65100);

    return StatusCardShell(
      accentColor: accent,
      icon: ScaleTransition(
        scale: _pulseAnimation,
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: const Color(0xFFFFF3E0),
            borderRadius: BorderRadius.circular(AppRadius.xl),
          ),
          child: const Icon(
            Icons.two_wheeler_rounded,
            color: accent,
          ),
        ),
      ),
      title: '¡Contrato firmado!',
      description:
          'Elige la moto que más te guste, selecciona el color y confirma '
          'tu frecuencia de pago. Recuerda: el primer pago incluye la cuota '
          'inicial más tu cuota adelantada.',
      action: widget.onSelectMoto != null
          ? SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: widget.onSelectMoto,
                style: FilledButton.styleFrom(
                  backgroundColor: accent,
                  foregroundColor: Colors.white,
                  minimumSize: Size(
                    double.infinity,
                    Responsive.isCompact(context) ? 44 : 48,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                ),
                child: Text(
                  'Elegir mi moto',
                  style: AppTypography.labelMd.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            )
          : null,
    );
  }
}

class _PendingPaymentCard extends StatelessWidget {
  const _PendingPaymentCard({required this.compra});

  final UserMotoCompra compra;

  static const _paymentInstructions = [
    'Davivienda convenio 1642750',
    'Llave @9013970152 · Soluciones Pinilla SAS',
    'Daviplata 3168101010',
  ];

  String get _title {
    if (compra.pagoInicialConfirmado && !compra.pagoCuotaConfirmado) {
      return 'Cuota inicial pagada';
    }
    if (compra.pagoCuotaConfirmado && !compra.pagoInicialConfirmado) {
      return 'Cuota adelantada pagada';
    }
    return 'Moto seleccionada';
  }

  String get _description {
    if (compra.pagoInicialConfirmado && !compra.pagoCuotaConfirmado) {
      return 'Confirmamos tu cuota inicial. Falta confirmar la cuota '
          '${compra.frecuenciaPago.label.toLowerCase()} por adelantado.';
    }
    if (compra.pagoCuotaConfirmado && !compra.pagoInicialConfirmado) {
      return 'Confirmamos tu cuota adelantada. Falta confirmar la cuota inicial.';
    }
    return 'Tu ${compra.modelo} (${compra.color}) está reservada. '
        'Realiza el pago de cuota inicial y cuota '
        '${compra.frecuenciaPago.label.toLowerCase()} por adelantado. '
        'Te avisaremos cuando sea confirmado.';
  }

  @override
  Widget build(BuildContext context) {
    const accent = Color(0xFF1565C0);

    return StatusCardShell(
      accentColor: accent,
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
                color: accent,
              ),
            ),
            Icon(
              Icons.payments_outlined,
              size: Responsive.isCompact(context) ? 20 : 22,
              color: accent,
            ),
          ],
        ),
      ),
      title: _title,
      description: _description,
      footer: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StatusInfoRow(
            icon: Icons.two_wheeler_outlined,
            label: '${compra.modelo} · ${compra.color}',
          ),
          const SizedBox(height: AppSpacing.sm),
          StatusInfoRow(
            icon: Icons.calendar_view_day_outlined,
            label:
                'Frecuencia: ${compra.frecuenciaPago.label} (${compra.frecuenciaPago.periodDescription})',
          ),
          const SizedBox(height: AppSpacing.sm),
          StatusInfoRow(
            icon: Icons.attach_money_rounded,
            label:
                'Cuota inicial: ${MotoPaymentCalculator.formatCop(compra.cuotaInicialMonto)}'
                '${compra.pagoInicialConfirmado ? ' · Pagada' : ' · Pendiente'}',
          ),
          const SizedBox(height: AppSpacing.sm),
          StatusInfoRow(
            icon: Icons.schedule_rounded,
            label:
                'Cuota ${compra.frecuenciaPago.label.toLowerCase()}: '
                '${MotoPaymentCalculator.formatCop(compra.montoCuotaPeriodo)}'
                '${compra.pagoCuotaConfirmado ? ' · Pagada' : ' · Pendiente'}',
          ),
          if (!compra.pagoInicialConfirmado || !compra.pagoCuotaConfirmado) ...[
            const SizedBox(height: AppSpacing.sm),
            StatusInfoRow(
              icon: Icons.receipt_long_outlined,
              label:
                  'Total a pagar ahora: ${MotoPaymentCalculator.formatCop(compra.montoTotalPrimerPago)}',
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Medios de pago',
              style: AppTypography.labelMd.copyWith(
                color: AppColors.onSurface,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            for (final line in _paymentInstructions) ...[
              StatusInfoRow(icon: Icons.account_balance_outlined, label: line),
              const SizedBox(height: AppSpacing.xs),
            ],
          ],
        ],
      ),
    );
  }
}

class _ReadyForPickupCard extends StatefulWidget {
  const _ReadyForPickupCard({required this.compra});

  final UserMotoCompra compra;

  @override
  State<_ReadyForPickupCard> createState() => _ReadyForPickupCardState();
}

class _ReadyForPickupCardState extends State<_ReadyForPickupCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _celebrateController;
  late final Animation<double> _celebrateAnimation;

  @override
  void initState() {
    super.initState();
    _celebrateController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..forward();
    _celebrateAnimation = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _celebrateController, curve: Curves.elasticOut),
    );
  }

  @override
  void dispose() {
    _celebrateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const accent = Color(0xFF1B7A3D);
    final compra = widget.compra;
    final fechaEntrega = compra.fechaEntrega;

    return ScaleTransition(
      scale: _celebrateAnimation,
      child: StatusCardShell(
        accentColor: accent,
        icon: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: const Color(0xFFE8F5E9),
            borderRadius: BorderRadius.circular(AppRadius.xl),
          ),
          child: const Icon(
            Icons.celebration_rounded,
            color: accent,
          ),
        ),
        title: 'Pagado',
        description:
            'Confirmamos tu cuota inicial y tu cuota adelantada. '
            'Acércate al concesionario para retirar tu ${compra.modelo}.',
        footer: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            StatusInfoRow(
              icon: Icons.two_wheeler_outlined,
              label: '${compra.modelo} · ${compra.color}',
            ),
            if (compra.placa?.trim().isNotEmpty == true) ...[
              const SizedBox(height: AppSpacing.sm),
              StatusInfoRow(
                icon: Icons.pin_outlined,
                label: 'Placa: ${compra.placa!.trim()}',
              ),
            ],
            if (fechaEntrega != null) ...[
              const SizedBox(height: AppSpacing.sm),
              StatusInfoRow(
                icon: Icons.event_available_rounded,
                label:
                    'Fecha de entrega: ${fechaEntrega.day.toString().padLeft(2, '0')}/${fechaEntrega.month.toString().padLeft(2, '0')}/${fechaEntrega.year}',
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DeliveredCard extends StatelessWidget {
  const _DeliveredCard({required this.compra});

  final UserMotoCompra compra;

  @override
  Widget build(BuildContext context) {
    const accent = Color(0xFF1B7A3D);

    return StatusCardShell(
      accentColor: accent,
      icon: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: const Color(0xFFE8F5E9),
          borderRadius: BorderRadius.circular(AppRadius.xl),
        ),
        child: const Icon(
          Icons.check_circle_rounded,
          color: accent,
        ),
      ),
      title: 'Moto entregada',
      description:
          'Tu ${compra.modelo} (${compra.color}) fue entregada. ¡Disfrútala!',
      footer: compra.placa?.trim().isNotEmpty == true
          ? StatusInfoRow(
              icon: Icons.pin_outlined,
              label: 'Placa: ${compra.placa!.trim()}',
            )
          : null,
    );
  }
}

class _CancelledCard extends StatelessWidget {
  const _CancelledCard({required this.compra});

  final UserMotoCompra compra;

  @override
  Widget build(BuildContext context) {
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
          Icons.cancel_outlined,
          color: AppColors.onErrorContainer,
        ),
      ),
      title: 'Selección cancelada',
      description:
          'Tu selección de ${compra.modelo} fue cancelada. '
          'Contacta al concesionario para más información.',
    );
  }
}
