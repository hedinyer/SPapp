import 'package:flutter/material.dart';
import 'package:spapp/models/contrato_renting_form.dart';
import 'package:spapp/models/digital_contract.dart';
import 'package:spapp/models/hoja_vida_form.dart';
import 'package:spapp/screens/contrato_wizard_screen.dart';
import 'package:spapp/screens/contract_review_and_sign_screen.dart';
import 'package:spapp/screens/hoja_vida_wizard_screen.dart';
import 'package:spapp/services/contract_service.dart';
import 'package:spapp/theme/app_theme.dart';

enum FormSectionStatus { pendiente, enProgreso, listo }

class ContractFormsHubScreen extends StatefulWidget {
  const ContractFormsHubScreen({
    super.key,
    required this.userId,
    required this.usersDocumentsId,
    this.initialContract,
  });

  final int userId;
  final int usersDocumentsId;
  final DigitalContract? initialContract;

  @override
  State<ContractFormsHubScreen> createState() => _ContractFormsHubScreenState();
}

class _ContractFormsHubScreenState extends State<ContractFormsHubScreen> {
  DigitalContract? _contract;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    try {
      final contract = widget.initialContract ??
          await ContractService.getOrCreate(
            userId: widget.userId,
            usersDocumentsId: widget.usersDocumentsId,
          );
      if (mounted) {
        setState(() {
          _contract = contract;
          _isLoading = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() => _isLoading = false);
        _showMessage(error.toString());
      }
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  HojaVidaForm get _hojaVida =>
      HojaVidaForm.fromJson(_contract?.hojaVidaData ?? {});

  ContratoRentingForm get _contrato =>
      ContratoRentingForm.fromJson(_contract?.contratoData ?? {});

  FormSectionStatus get _hojaVidaStatus {
    if (_hojaVida.isComplete) return FormSectionStatus.listo;
    if (_hojaVida.nombreCompleto.isNotEmpty) {
      return FormSectionStatus.enProgreso;
    }
    return FormSectionStatus.pendiente;
  }

  FormSectionStatus get _contratoStatus {
    if (_contrato.isComplete) return FormSectionStatus.listo;
    if (_contrato.nombreContratante.isNotEmpty) {
      return FormSectionStatus.enProgreso;
    }
    return FormSectionStatus.pendiente;
  }

  bool get _canReviewAndSign =>
      _hojaVida.isComplete &&
      _contrato.isComplete &&
      _contract?.isSigned != true;

  Future<void> _openHojaVida() async {
    if (_contract == null) return;
    final updated = await Navigator.of(context).push<HojaVidaForm>(
      MaterialPageRoute(
        builder: (_) => HojaVidaWizardScreen(
          contractId: _contract!.id,
          initialForm: _hojaVida,
        ),
      ),
    );
    if (updated != null) await _load();
  }

  Future<void> _openContrato() async {
    if (_contract == null) return;
    final hojaVida = _hojaVida;
    final updated = await Navigator.of(context).push<ContratoRentingForm>(
      MaterialPageRoute(
        builder: (_) => ContratoWizardScreen(
          contractId: _contract!.id,
          initialForm: _contrato,
          prefilledName: hojaVida.nombreCompleto,
          prefilledCedula: hojaVida.numeroIdentificacion,
          prefilledAddress:
              '${hojaVida.direccion} ${hojaVida.barrio}'.trim(),
        ),
      ),
    );
    if (updated != null) await _load();
  }

  Future<void> _openReviewAndSign() async {
    if (_contract == null || !_canReviewAndSign) return;
    final signed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => ContractReviewAndSignScreen(
          contract: _contract!,
          userId: widget.userId,
          hojaVida: _hojaVida,
          contrato: _contrato,
        ),
      ),
    );
    if (signed == true && mounted) {
      await _load();
      if (mounted) Navigator.of(context).pop(true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSigned = _contract?.isSigned == true;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.onSurface,
        elevation: 0,
        title: Text('Tus formatos', style: AppTypography.headlineSm),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isSigned
                        ? 'Ya completaste y firmaste tus formatos.'
                        : 'Completa los dos documentos. Te guiamos paso a paso.',
                    style: AppTypography.bodyMd.copyWith(
                      color: AppColors.secondary,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _FormCard(
                    title: 'Hoja de Vida Venta a Crédito',
                    subtitle: 'Datos personales, trabajo y referencias',
                    status: isSigned ? FormSectionStatus.listo : _hojaVidaStatus,
                    onTap: isSigned ? null : _openHojaVida,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _FormCard(
                    title: 'Contrato de Renting',
                    subtitle: 'Lee las cláusulas y confirma tus datos',
                    status: isSigned ? FormSectionStatus.listo : _contratoStatus,
                    onTap: isSigned ? null : _openContrato,
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  if (isSigned)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F5E9),
                        borderRadius: BorderRadius.circular(AppRadius.xl),
                        border: Border.all(
                          color: const Color(0xFF1B7A3D).withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.check_circle_rounded,
                            color: Color(0xFF1B7A3D),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Text(
                              'Formatos completados y firmados',
                              style: AppTypography.labelMd.copyWith(
                                color: const Color(0xFF1B7A3D),
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  else if (_canReviewAndSign)
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _openReviewAndSign,
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: AppColors.onPrimary,
                          padding: const EdgeInsets.symmetric(
                            vertical: AppSpacing.md,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppRadius.full),
                          ),
                        ),
                        child: const Text('Revisar y firmar'),
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}

class _FormCard extends StatelessWidget {
  const _FormCard({
    required this.title,
    required this.subtitle,
    required this.status,
    this.onTap,
  });

  final String title;
  final String subtitle;
  final FormSectionStatus status;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final (label, color, icon) = switch (status) {
      FormSectionStatus.pendiente => (
          'Pendiente',
          AppColors.secondary,
          Icons.radio_button_unchecked_rounded,
        ),
      FormSectionStatus.enProgreso => (
          'En progreso',
          AppColors.primary,
          Icons.timelapse_rounded,
        ),
      FormSectionStatus.listo => (
          'Listo',
          const Color(0xFF1B7A3D),
          Icons.check_circle_rounded,
        ),
    };

    return Material(
      color: AppColors.surfaceContainerLowest,
      borderRadius: BorderRadius.circular(AppRadius.xl),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.xl),
            border: Border.all(color: AppColors.outlineVariant),
          ),
          child: Row(
            children: [
              Icon(icon, color: color),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: AppTypography.labelMd),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      subtitle,
                      style: AppTypography.bodySm.copyWith(
                        color: AppColors.secondary,
                      ),
                    ),
                  ],
                ),
              ),
              Text(label, style: AppTypography.labelSm.copyWith(color: color)),
              if (onTap != null) ...[
                const SizedBox(width: AppSpacing.sm),
                const Icon(Icons.chevron_right_rounded),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
