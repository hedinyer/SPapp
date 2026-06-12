import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:signature/signature.dart';
import 'package:spapp/models/contrato_renting_form.dart';
import 'package:spapp/models/digital_contract.dart';
import 'package:spapp/models/hoja_vida_form.dart';
import 'package:spapp/services/contract_pdf_service.dart';
import 'package:spapp/services/contract_service.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/widgets/contract_form_widgets.dart';

class ContractReviewAndSignScreen extends StatefulWidget {
  const ContractReviewAndSignScreen({
    super.key,
    required this.contract,
    required this.userId,
    required this.hojaVida,
    required this.contrato,
  });

  final DigitalContract contract;
  final int userId;
  final HojaVidaForm hojaVida;
  final ContratoRentingForm contrato;

  @override
  State<ContractReviewAndSignScreen> createState() =>
      _ContractReviewAndSignScreenState();
}

class _ContractReviewAndSignScreenState
    extends State<ContractReviewAndSignScreen> {
  final _signatureController = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
    exportPenColor: Colors.black,
  );

  bool _isSubmitting = false;
  bool _acceptedTerms = false;

  @override
  void initState() {
    super.initState();
    ContractPdfService.preloadFonts();
  }

  @override
  void dispose() {
    _signatureController.dispose();
    super.dispose();
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<Uint8List?> _exportSignature() async {
    if (_signatureController.isEmpty) return null;

    try {
      return await _signatureController.toPngBytes().timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw TimeoutException('La firma tardó demasiado.');
        },
      );
    } catch (error) {
      if (kDebugMode) debugPrint('Signature export error: $error');
      return null;
    }
  }

  Future<void> _submit() async {
    if (_isSubmitting) return;

    if (!_acceptedTerms) {
      _showMessage('Confirma que aceptas los documentos.');
      return;
    }

    final signatureBytes = await _exportSignature();
    if (signatureBytes == null) {
      _showMessage('Diligencia tu firma en el recuadro e intenta de nuevo.');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final hojaVidaPdf = await ContractPdfService.generateHojaVidaPdf(
        form: widget.hojaVida,
        signatureBytes: signatureBytes,
      );
      final contratoPdf = await ContractPdfService.generateContratoPdf(
        form: widget.contrato,
        signatureBytes: signatureBytes,
      );

      await ContractService.finalizeSigned(
        contractId: widget.contract.id,
        userId: widget.userId,
        hojaVida: widget.hojaVida,
        contrato: widget.contrato,
        signatureBytes: signatureBytes,
        hojaVidaPdf: hojaVidaPdf,
        contratoPdf: contratoPdf,
      );

      if (!mounted) return;

      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => AlertDialog(
          title: const Text('¡Listo!'),
          content: const Text(
            'Tus formatos fueron firmados y guardados correctamente.',
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Continuar'),
            ),
          ],
        ),
      );

      if (mounted) Navigator.of(context).pop(true);
    } on ContractServiceException catch (error) {
      _showMessage(error.message);
    } on ContractPdfException catch (error) {
      _showMessage(error.message);
    } catch (error, stackTrace) {
      if (kDebugMode) {
        debugPrint('Sign submit error: $error');
        debugPrint('$stackTrace');
      }
      _showMessage('No se pudieron guardar los documentos. Intenta de nuevo.');
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.onSurface,
        elevation: 0,
        title: Text('Revisar y firmar', style: AppTypography.headlineSm),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Revisa tus datos',
                    style: AppTypography.headlineMd,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Si algo está mal, vuelve atrás y corrígelo antes de firmar.',
                    style: AppTypography.bodyMd.copyWith(
                      color: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _SummarySection(
                    title: 'Hoja de Vida',
                    lines: [
                      'Nombre: ${widget.hojaVida.nombreCompleto}',
                      'Documento: ${widget.hojaVida.numeroIdentificacion}',
                      'Celular: ${widget.hojaVida.celular}',
                      'Correo: ${widget.hojaVida.correo}',
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _SummarySection(
                    title: 'Contrato de Renting',
                    lines: [
                      'Contratante: ${widget.contrato.nombreContratante}',
                      'Cédula: ${widget.contrato.cedulaContratante}',
                      'Dirección: ${widget.contrato.direccionNotificaciones}',
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Text('Tu firma', style: AppTypography.headlineMd),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Diligencia tu firma con el dedo en el recuadro blanco.',
                    style: AppTypography.bodyMd.copyWith(
                      color: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Container(
                    height: 180,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(AppRadius.xl),
                      border: Border.all(color: AppColors.outlineVariant),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(AppRadius.xl),
                      child: Signature(
                        controller: _signatureController,
                        backgroundColor: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: _isSubmitting
                          ? null
                          : () => _signatureController.clear(),
                      child: const Text('Limpiar firma'),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  CheckboxListTile(
                    value: _acceptedTerms,
                    onChanged: _isSubmitting
                        ? null
                        : (v) => setState(() => _acceptedTerms = v ?? false),
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    title: Text(
                      'Confirmo que la información es correcta y firmo los documentos.',
                      style: AppTypography.bodyMd.copyWith(height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
          ),
          ContractBottomActions(
            onPrimary: _submit,
            primaryLabel: 'Firmar y enviar',
            isLoading: _isSubmitting,
            primaryEnabled: _acceptedTerms && !_isSubmitting,
          ),
        ],
      ),
    );
  }
}

class _SummarySection extends StatelessWidget {
  const _SummarySection({required this.title, required this.lines});

  final String title;
  final List<String> lines;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTypography.labelMd),
          const SizedBox(height: AppSpacing.sm),
          ...lines.map(
            (line) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.xs),
              child: Text(
                line,
                style: AppTypography.bodySm.copyWith(
                  color: AppColors.secondary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
