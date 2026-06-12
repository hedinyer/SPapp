import 'package:flutter/material.dart';
import 'package:spapp/models/bike_inventory.dart';
import 'package:spapp/models/moto_payment_calculator.dart';
import 'package:spapp/models/tarifa_pagada.dart';
import 'package:spapp/models/user_moto_compra.dart';
import 'package:spapp/services/bike_service.dart';
import 'package:spapp/services/tarifa_watcher.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';
import 'package:spapp/widgets/status_card_shell.dart';
import 'package:url_launcher/url_launcher.dart';

const _whatsappPagos = '573165772514';

class MotoOwnerCard extends StatefulWidget {
  const MotoOwnerCard({
    super.key,
    required this.compra,
    required this.userId,
    this.username,
  });

  final UserMotoCompra compra;
  final int userId;
  final String? username;

  @override
  State<MotoOwnerCard> createState() => _MotoOwnerCardState();
}

class _MotoOwnerCardState extends State<MotoOwnerCard> {
  BikeInventory? _bike;
  bool _isBikeLoading = true;
  TarifaResumenPagos _resumen = TarifaResumenPagos.empty;
  TarifaWatcher? _tarifaWatcher;

  @override
  void initState() {
    super.initState();
    _loadBike();
    _tarifaWatcher = TarifaWatcher(
      userId: widget.userId,
      compra: widget.compra,
      onChanged: (resumen) {
        if (!mounted) return;
        setState(() => _resumen = resumen);
      },
    )..start();
  }

  @override
  void dispose() {
    _tarifaWatcher?.dispose();
    super.dispose();
  }

  Future<void> _loadBike() async {
    final bike = await BikeService.fetchById(widget.compra.bikeId);
    if (!mounted) return;
    setState(() {
      _bike = bike;
      _isBikeLoading = false;
    });
  }

  Future<void> _openWhatsAppPago() async {
    final compra = widget.compra;
    final placa = compra.placa?.trim();
    final lines = [
      'Hola, quiero pagar mi tarifa de renting.',
      'Moto: ${compra.modelo} (${compra.color})',
      if (placa != null && placa.isNotEmpty) 'Placa: $placa',
      'Cuota ${compra.frecuenciaPago.label.toLowerCase()}: '
          '${MotoPaymentCalculator.formatCop(compra.montoCuotaPeriodo)}',
      if (widget.username != null && widget.username!.isNotEmpty)
        'Usuario: ${widget.username}',
    ];
    final text = Uri.encodeComponent(lines.join('\n'));
    final uri = Uri.parse('https://wa.me/$_whatsappPagos?text=$text');

    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se pudo abrir WhatsApp. Intenta de nuevo.'),
        ),
      );
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    const accent = Color(0xFF1B7A3D);
    final compra = widget.compra;
    final imageUrl = _bike?.imagenUrl?.trim();

    return StatusCardShell(
      accentColor: accent,
      icon: _isBikeLoading
          ? const SizedBox(
              width: 48,
              height: 48,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: accent,
              ),
            )
          : ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.xl),
              child: imageUrl != null && imageUrl.isNotEmpty
                  ? Image.network(
                      imageUrl,
                      width: 48,
                      height: 48,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          _bikeIcon(accent),
                    )
                  : _bikeIcon(accent),
            ),
      title: 'Mi moto',
      description:
          'Tu ${compra.modelo} (${compra.color}) está activa. '
          'Aquí puedes ver tu plan de pagos y reportar tu tarifa.',
      footer: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (imageUrl != null && imageUrl.isNotEmpty) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.lg),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(
                  imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) =>
                      const SizedBox.shrink(),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
          ],
          if (compra.placa?.trim().isNotEmpty == true) ...[
            StatusInfoRow(
              icon: Icons.pin_outlined,
              label: 'Placa: ${compra.placa!.trim()}',
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
          StatusInfoRow(
            icon: Icons.calendar_view_day_outlined,
            label:
                'Frecuencia: ${compra.frecuenciaPago.label} '
                '(${compra.frecuenciaPago.periodDescription})',
          ),
          const SizedBox(height: AppSpacing.sm),
          StatusInfoRow(
            icon: Icons.attach_money_rounded,
            label:
                'Cuota ${compra.frecuenciaPago.label.toLowerCase()}: '
                '${MotoPaymentCalculator.formatCop(compra.montoCuotaPeriodo)}',
          ),
          const SizedBox(height: AppSpacing.sm),
          StatusInfoRow(
            icon: Icons.savings_outlined,
            label:
                'Total pagado: ${MotoPaymentCalculator.formatCop(_resumen.totalPagado)}',
          ),
          if (_resumen.totalAdeudado > 0) ...[
            const SizedBox(height: AppSpacing.sm),
            StatusInfoRow(
              icon: Icons.warning_amber_rounded,
              label:
                  'Adeudado: ${MotoPaymentCalculator.formatCop(_resumen.totalAdeudado)}',
            ),
          ],
          if (_resumen.proximoVencimiento != null &&
              _resumen.cuotasVencidas == 0) ...[
            const SizedBox(height: AppSpacing.sm),
            StatusInfoRow(
              icon: Icons.event_outlined,
              label:
                  'Próximo vencimiento: ${_formatDate(_resumen.proximoVencimiento!)}',
            ),
          ],
          if (_resumen.diasAtraso != null && _resumen.diasAtraso! > 0) ...[
            const SizedBox(height: AppSpacing.sm),
            StatusInfoRow(
              icon: Icons.schedule_rounded,
              label: 'Días de atraso: ${_resumen.diasAtraso}',
            ),
          ],
          if (_resumen.enMora) ...[
            const SizedBox(height: AppSpacing.sm),
            StatusInfoRow(
              icon: Icons.error_outline_rounded,
              label: 'Estás en mora. Paga lo antes posible.',
            ),
          ],
        ],
      ),
      action: SizedBox(
        width: double.infinity,
        child: FilledButton.icon(
          onPressed: _openWhatsAppPago,
          icon: const Icon(Icons.chat_rounded),
          label: const Text('Pagar tarifa'),
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFF25D366),
            foregroundColor: Colors.white,
            padding: EdgeInsets.symmetric(
              vertical: Responsive.lerp(context, min: 14, max: 16),
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.full),
            ),
          ),
        ),
      ),
    );
  }

  Widget _bikeIcon(Color accent) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: const Color(0xFFE8F5E9),
        borderRadius: BorderRadius.circular(AppRadius.xl),
      ),
      child: Icon(Icons.two_wheeler_rounded, color: accent),
    );
  }
}
