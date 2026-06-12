import 'package:flutter/material.dart';
import 'package:spapp/models/bike_inventory.dart';
import 'package:spapp/models/moto_payment_calculator.dart';
import 'package:spapp/models/user_moto_compra.dart';
import 'package:spapp/services/bike_service.dart';
import 'package:spapp/services/moto_compra_service.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';

class MotoSelectionScreen extends StatefulWidget {
  const MotoSelectionScreen({
    super.key,
    required this.userId,
    required this.digitalContractId,
  });

  final int userId;
  final String digitalContractId;

  @override
  State<MotoSelectionScreen> createState() => _MotoSelectionScreenState();
}

class _MotoSelectionScreenState extends State<MotoSelectionScreen> {
  static const _steps = ['Catálogo', 'Frecuencia', 'Confirmar'];

  int _step = 0;
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _error;
  List<BikeInventory> _bikes = [];
  BikeInventory? _selectedBike;
  FrecuenciaPago _frecuencia = FrecuenciaPago.semanal;

  @override
  void initState() {
    super.initState();
    _loadBikes();
  }

  Future<void> _loadBikes() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final bikes = await BikeService.fetchAvailableBikes();
    if (!mounted) return;

    setState(() {
      _bikes = bikes;
      _isLoading = false;
      if (bikes.isEmpty) {
        _error = 'No hay motos disponibles en este momento.';
      }
    });
  }

  MotoPaymentSummary? get _paymentSummary {
    final bike = _selectedBike;
    if (bike == null) return null;
    return MotoPaymentCalculator.calculate(bike: bike, frecuencia: _frecuencia);
  }

  void _nextStep() {
    if (_step == 0 && _selectedBike == null) {
      _showSnack('Selecciona una moto para continuar.');
      return;
    }
    if (_step < 2) {
      setState(() => _step++);
    }
  }

  void _previousStep() {
    if (_step > 0) {
      setState(() => _step--);
    } else {
      Navigator.of(context).pop(false);
    }
  }

  Future<void> _confirmSelection() async {
    final bike = _selectedBike;
    if (bike == null) return;

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      await MotoCompraService.createCompra(
        userId: widget.userId,
        digitalContractId: widget.digitalContractId,
        bike: bike,
        frecuencia: _frecuencia,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on MotoCompraServiceException catch (error) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _error = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
        _error = 'No se pudo confirmar tu selección. Intenta de nuevo.';
      });
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final horizontalPad = Responsive.horizontalPadding(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: _previousStep,
        ),
        title: Text(
          'Elige tu moto',
          style: AppTypography.headlineSm,
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: horizontalPad),
            child: _StepIndicator(currentStep: _step, steps: _steps),
          ),
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  )
                : _error != null && _bikes.isEmpty
                    ? _ErrorState(message: _error!, onRetry: _loadBikes)
                    : Padding(
                        padding: EdgeInsets.fromLTRB(
                          horizontalPad,
                          AppSpacing.lg,
                          horizontalPad,
                          AppSpacing.lg,
                        ),
                        child: switch (_step) {
                          0 => _CatalogStep(
                              bikes: _bikes,
                              selectedBike: _selectedBike,
                              onSelect: (bike) =>
                                  setState(() => _selectedBike = bike),
                            ),
                          1 => _FrequencyStep(
                              bike: _selectedBike!,
                              frecuencia: _frecuencia,
                              onChanged: (value) =>
                                  setState(() => _frecuencia = value),
                            ),
                          _ => _SummaryStep(
                              bike: _selectedBike!,
                              frecuencia: _frecuencia,
                              payment: _paymentSummary!,
                              error: _error,
                            ),
                        },
                      ),
          ),
          if (!_isLoading && _bikes.isNotEmpty)
            Padding(
              padding: EdgeInsets.fromLTRB(
                horizontalPad,
                AppSpacing.sm,
                horizontalPad,
                MediaQuery.paddingOf(context).bottom + AppSpacing.lg,
              ),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _isSubmitting
                      ? null
                      : (_step == 2 ? _confirmSelection : _nextStep),
                  style: FilledButton.styleFrom(
                    minimumSize: Size(
                      double.infinity,
                      Responsive.isCompact(context) ? 48 : 52,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          _step == 2 ? 'Confirmar selección' : 'Continuar',
                          style: AppTypography.labelMd.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.currentStep, required this.steps});

  final int currentStep;
  final List<String> steps;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < steps.length; i++) ...[
          if (i > 0)
            Expanded(
              child: Container(
                height: 2,
                color: i <= currentStep
                    ? AppColors.primary
                    : AppColors.outlineVariant,
              ),
            ),
          Column(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: i <= currentStep
                    ? AppColors.primary
                    : AppColors.surfaceContainer,
                child: Text(
                  '${i + 1}',
                  style: AppTypography.labelSm.copyWith(
                    color: i <= currentStep
                        ? Colors.white
                        : AppColors.secondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                steps[i],
                style: AppTypography.labelSm.copyWith(
                  color: i == currentStep
                      ? AppColors.primary
                      : AppColors.secondary,
                  fontSize: 10,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class _CatalogStep extends StatelessWidget {
  const _CatalogStep({
    required this.bikes,
    required this.selectedBike,
    required this.onSelect,
  });

  final List<BikeInventory> bikes;
  final BikeInventory? selectedBike;
  final ValueChanged<BikeInventory> onSelect;

  @override
  Widget build(BuildContext context) {
    final grouped = <String, List<BikeInventory>>{};
    for (final bike in bikes) {
      grouped.putIfAbsent(bike.modelo, () => []).add(bike);
    }

    return ListView(
      children: [
        Text(
          'Selecciona modelo y color',
          style: AppTypography.headlineSm,
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          'Solo se muestran motos con stock disponible.',
          style: AppTypography.bodySm.copyWith(color: AppColors.secondary),
        ),
        const SizedBox(height: AppSpacing.lg),
        for (final entry in grouped.entries) ...[
          Text(
            entry.key,
            style: AppTypography.labelMd.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              for (final bike in entry.value)
                _BikeVariantChip(
                  bike: bike,
                  selected: selectedBike?.id == bike.id,
                  onTap: () => onSelect(bike),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
        ],
      ],
    );
  }
}

class _BikeVariantChip extends StatelessWidget {
  const _BikeVariantChip({
    required this.bike,
    required this.selected,
    required this.onTap,
  });

  final BikeInventory bike;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imageUrl = bike.imagenUrl?.trim();

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.xl),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: Responsive.isCompact(context) ? 150 : 168,
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(AppRadius.xl),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.outlineVariant,
            width: selected ? 2 : 1,
          ),
          boxShadow: selected ? AppShadows.subtle : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.lg),
              child: SizedBox(
                height: 88,
                width: double.infinity,
                child: imageUrl != null && imageUrl.isNotEmpty
                    ? Image.network(
                        imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => _imagePlaceholder(),
                      )
                    : _imagePlaceholder(),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              bike.color,
              style: AppTypography.labelMd.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              'Stock: ${bike.stock}',
              style: AppTypography.labelSm.copyWith(
                color: AppColors.secondary,
              ),
            ),
            Text(
              'Inicial ${MotoPaymentCalculator.formatCop(bike.cuotaInicial)}',
              style: AppTypography.labelSm.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _imagePlaceholder() {
    return ColoredBox(
      color: AppColors.surfaceContainer,
      child: const Center(
        child: Icon(Icons.two_wheeler_outlined, color: AppColors.outline),
      ),
    );
  }
}

class _FrequencyStep extends StatelessWidget {
  const _FrequencyStep({
    required this.bike,
    required this.frecuencia,
    required this.onChanged,
  });

  final BikeInventory bike;
  final FrecuenciaPago frecuencia;
  final ValueChanged<FrecuenciaPago> onChanged;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        Text(
          'Frecuencia de pago',
          style: AppTypography.headlineSm,
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          '${bike.modelo} · ${bike.color}',
          style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
        ),
        const SizedBox(height: AppSpacing.lg),
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF8E1),
            borderRadius: BorderRadius.circular(AppRadius.xl),
            border: Border.all(color: const Color(0xFFFFE082)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Pagos por adelantado',
                style: AppTypography.labelMd.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Los pagos semanal, quincenal y mensual se cancelan por adelantado. '
                'Tu primer pago incluye la cuota inicial más el periodo adelantado que elijas.',
                style: AppTypography.bodySm.copyWith(
                  color: AppColors.secondary,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        for (final option in FrecuenciaPago.values) ...[
          _FrequencyOptionTile(
            frecuencia: option,
            amount: MotoPaymentCalculator.montoCuotaPeriodo(
              cuotaDiaria: bike.cuotaDiaria,
              frecuencia: option,
            ),
            selected: frecuencia == option,
            onTap: () => onChanged(option),
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
      ],
    );
  }
}

class _FrequencyOptionTile extends StatelessWidget {
  const _FrequencyOptionTile({
    required this.frecuencia,
    required this.amount,
    required this.selected,
    required this.onTap,
  });

  final FrecuenciaPago frecuencia;
  final int amount;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected
          ? AppColors.primary.withValues(alpha: 0.08)
          : AppColors.surfaceContainerLowest,
      borderRadius: BorderRadius.circular(AppRadius.xl),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.xl),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.outlineVariant,
            ),
          ),
          child: Row(
            children: [
              Icon(
                selected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_off_rounded,
                color: selected ? AppColors.primary : AppColors.secondary,
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      frecuencia.label,
                      style: AppTypography.labelMd.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      frecuencia.periodDescription,
                      style: AppTypography.bodySm.copyWith(
                        color: AppColors.secondary,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                MotoPaymentCalculator.formatCop(amount),
                style: AppTypography.labelMd.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryStep extends StatelessWidget {
  const _SummaryStep({
    required this.bike,
    required this.frecuencia,
    required this.payment,
    this.error,
  });

  final BikeInventory bike;
  final FrecuenciaPago frecuencia;
  final MotoPaymentSummary payment;
  final String? error;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        Text(
          'Resumen de tu selección',
          style: AppTypography.headlineSm,
        ),
        const SizedBox(height: AppSpacing.lg),
        _SummaryRow(label: 'Modelo', value: bike.modelo),
        _SummaryRow(label: 'Color', value: bike.color),
        _SummaryRow(label: 'Frecuencia', value: frecuencia.label),
        const Divider(height: AppSpacing.xl),
        _SummaryRow(
          label: 'Cuota inicial',
          value: MotoPaymentCalculator.formatCop(payment.cuotaInicialMonto),
        ),
        _SummaryRow(
          label: 'Cuota ${frecuencia.label.toLowerCase()} (adelantada)',
          value: MotoPaymentCalculator.formatCop(payment.montoCuotaPeriodo),
        ),
        const SizedBox(height: AppSpacing.md),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(AppRadius.xl),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Total a pagar ahora',
                style: AppTypography.labelMd.copyWith(
                  color: Colors.white.withValues(alpha: 0.85),
                ),
              ),
              Text(
                MotoPaymentCalculator.formatCop(payment.montoTotalPrimerPago),
                style: AppTypography.headlineMd.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        if (error != null) ...[
          const SizedBox(height: AppSpacing.md),
          Text(
            error!,
            style: AppTypography.bodySm.copyWith(color: AppColors.error),
          ),
        ],
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
            ),
          ),
          Text(
            value,
            style: AppTypography.labelMd.copyWith(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.inventory_2_outlined, size: 48, color: AppColors.outline),
          const SizedBox(height: AppSpacing.md),
          Text(
            message,
            textAlign: TextAlign.center,
            style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
          ),
          const SizedBox(height: AppSpacing.lg),
          OutlinedButton(onPressed: onRetry, child: const Text('Reintentar')),
        ],
      ),
    );
  }
}
