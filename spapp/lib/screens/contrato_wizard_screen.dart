import 'package:flutter/material.dart';
import 'package:spapp/data/contrato_renting_clausulas.dart';
import 'package:spapp/models/contrato_renting_form.dart';
import 'package:spapp/services/contract_service.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/utils/colombia_time.dart';
import 'package:spapp/widgets/contract_form_widgets.dart';

class ContratoWizardScreen extends StatefulWidget {
  const ContratoWizardScreen({
    super.key,
    required this.contractId,
    required this.initialForm,
    this.prefilledName = '',
    this.prefilledCedula = '',
    this.prefilledAddress = '',
  });

  final String contractId;
  final ContratoRentingForm initialForm;
  final String prefilledName;
  final String prefilledCedula;
  final String prefilledAddress;

  @override
  State<ContratoWizardScreen> createState() => _ContratoWizardScreenState();
}

class _ContratoWizardScreenState extends State<ContratoWizardScreen> {
  late ContratoRentingForm _form;
  int _step = 0;
  bool _isSaving = false;
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameCtrl;
  late final TextEditingController _cedulaCtrl;
  late final TextEditingController _addressCtrl;

  int get _totalSteps => 2 + ContratoRentingClausulas.blocks.length + 1;

  @override
  void initState() {
    super.initState();
    final parts = colombiaDateParts();
    _form = widget.initialForm;
    if (_form.nombreContratante.isEmpty && widget.prefilledName.isNotEmpty) {
      _form = _form.copyWith(nombreContratante: widget.prefilledName);
    }
    if (_form.cedulaContratante.isEmpty && widget.prefilledCedula.isNotEmpty) {
      _form = _form.copyWith(cedulaContratante: widget.prefilledCedula);
    }
    if (_form.direccionNotificaciones.isEmpty &&
        widget.prefilledAddress.isNotEmpty) {
      _form = _form.copyWith(direccionNotificaciones: widget.prefilledAddress);
    }
    if (_form.fechaFirmaDia.isEmpty) {
      _form = _form.copyWith(
        fechaFirmaDia: parts.dia,
        fechaFirmaMes: parts.mes,
        fechaFirmaAnio: parts.anio,
      );
    }

    _nameCtrl = TextEditingController(text: _form.nombreContratante);
    _cedulaCtrl = TextEditingController(text: _form.cedulaContratante);
    _addressCtrl = TextEditingController(text: _form.direccionNotificaciones);
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _cedulaCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  ContratoRentingFormData get _formData => ContratoRentingFormData(
        nombreContratante: _form.nombreContratante,
        cedulaContratante: _form.cedulaContratante,
        direccionNotificaciones: _form.direccionNotificaciones,
        fechaFirmaDia: _form.fechaFirmaDia,
        fechaFirmaMes: _form.fechaFirmaMes,
        fechaFirmaAnio: _form.fechaFirmaAnio,
      );

  Future<void> _saveDraft() async {
    await ContractService.saveContratoDraft(
      contractId: widget.contractId,
      form: _form,
    );
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  bool _validateStep() {
    if (_step == 0) {
      if (_formKey.currentState?.validate() != true) return false;
      setState(() {
        _form = _form.copyWith(
          nombreContratante: _nameCtrl.text.trim(),
          cedulaContratante: _cedulaCtrl.text.trim(),
          direccionNotificaciones: _addressCtrl.text.trim(),
        );
      });
      return true;
    }

    if (_step == _totalSteps - 1) {
      if (!_form.clausulasAceptadas) {
        _showMessage('Debes aceptar las cláusulas para continuar.');
        return false;
      }
      return true;
    }

    return true;
  }

  Future<void> _goNext() async {
    if (!_validateStep()) return;

    setState(() => _isSaving = true);
    try {
      await _saveDraft();
      if (!mounted) return;

      if (_step >= _totalSteps - 1) {
        if (mounted) {
          setState(() => _isSaving = false);
          Navigator.of(context).pop(_form);
        }
        return;
      }

      setState(() {
        _step++;
        _isSaving = false;
      });
    } catch (error) {
      if (mounted) {
        setState(() => _isSaving = false);
        _showMessage(error.toString());
      }
    }
  }

  void _goBack() {
    if (_step == 0) {
      Navigator.of(context).pop();
      return;
    }
    setState(() => _step--);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.onSurface,
        elevation: 0,
        leading: IconButton(
          onPressed: _isSaving ? null : _goBack,
          icon: const Icon(Icons.arrow_back_rounded),
        ),
        title: Text('Contrato de Renting', style: AppTypography.headlineSm),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(36),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              0,
              AppSpacing.lg,
              AppSpacing.md,
            ),
            child: ContractProgressBar(current: _step + 1, total: _totalSteps),
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: _buildStep(),
            ),
          ),
          ContractBottomActions(
            onPrimary: _goNext,
            primaryLabel: _step >= _totalSteps - 1 ? 'Guardar' : 'Entendido, continuar',
            onSecondary: _goBack,
            isLoading: _isSaving,
          ),
        ],
      ),
    );
  }

  Widget _buildStep() {
    if (_step == 0) {
      return Form(
        key: _formKey,
        child: ContractStepShell(
          title: 'Tus datos como contratante',
          subtitle:
              'Estos datos van en el contrato. Revísalos con cuidado.',
          legalLabel: 'CONTRATO DE RENTING — EL CONTRATANTE',
          child: Column(
            children: [
              ContractTextField(
                controller: _nameCtrl,
                label: 'Nombre completo',
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Escribe tu nombre' : null,
              ),
              const SizedBox(height: AppSpacing.md),
              ContractTextField(
                controller: _cedulaCtrl,
                label: 'Cédula',
                keyboardType: TextInputType.number,
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Escribe tu cédula' : null,
              ),
              const SizedBox(height: AppSpacing.md),
              ContractTextField(
                controller: _addressCtrl,
                label: 'Dirección para notificaciones',
                maxLines: 2,
                validator: (v) => v == null || v.trim().isEmpty
                    ? 'Escribe tu dirección'
                    : null,
              ),
            ],
          ),
        ),
      );
    }

    if (_step == 1) {
      final intro = ContratoRentingClausulas.renderIntro(_formData);
      return SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Inicio del contrato',
              style: AppTypography.headlineMd,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Lee con calma. Desliza hacia abajo para ver todo el texto.',
              style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
            ),
            const SizedBox(height: AppSpacing.lg),
            ContractLegalBox(
              title: 'Encabezado del contrato',
              body: intro,
            ),
          ],
        ),
      );
    }

    final blockIndex = _step - 2;
    if (blockIndex < ContratoRentingClausulas.blocks.length) {
      final block = ContratoRentingClausulas.blocks[blockIndex];
      return SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(block.title, style: AppTypography.headlineMd),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Texto legal del contrato. Tómate tu tiempo.',
              style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
            ),
            const SizedBox(height: AppSpacing.lg),
            ...block.clausulas.map((clausula) {
              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.lg),
                child: ContractLegalBox(
                  title: clausula.titulo,
                  body: ContratoRentingClausulas.renderClausulaTexto(
                    clausula.texto,
                    _formData,
                  ),
                ),
              );
            }),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Confirmación final', style: AppTypography.headlineMd),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Al marcar la casilla confirmas que leíste todo el contrato.',
            style: AppTypography.bodyMd.copyWith(color: AppColors.secondary),
          ),
          const SizedBox(height: AppSpacing.lg),
          ContractLegalBox(
            title: 'Firma del contrato',
            body: ContratoRentingClausulas.firmaTemplate
                .replaceAll('[DIA]', _form.fechaFirmaDia)
                .replaceAll('[MES]', _form.fechaFirmaMes)
                .replaceAll('[ANIO]', _form.fechaFirmaAnio)
                .replaceAll('[ANIO_NUM]', _form.fechaFirmaAnio),
          ),
          const SizedBox(height: AppSpacing.lg),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerLowest,
              borderRadius: BorderRadius.circular(AppRadius.xl),
              border: Border.all(color: AppColors.outlineVariant),
            ),
            child: CheckboxListTile(
              value: _form.clausulasAceptadas,
              onChanged: (v) => setState(
                () => _form = _form.copyWith(clausulasAceptadas: v ?? false),
              ),
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: Text(
                'He leído y acepto todas las cláusulas del CONTRATO DE RENTING',
                style: AppTypography.bodyMd.copyWith(height: 1.4),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
