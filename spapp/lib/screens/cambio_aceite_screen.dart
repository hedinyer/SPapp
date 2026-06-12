import 'package:flutter/material.dart';
import 'package:spapp/models/user_moto_compra.dart';
import 'package:spapp/services/solicitud_taller_service.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';

class CambioAceiteScreen extends StatefulWidget {
  const CambioAceiteScreen({
    super.key,
    required this.userId,
    required this.compra,
  });

  final int userId;
  final UserMotoCompra compra;

  @override
  State<CambioAceiteScreen> createState() => _CambioAceiteScreenState();
}

class _CambioAceiteScreenState extends State<CambioAceiteScreen> {
  DateTime? _fechaPreferida;
  final _notasController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _notasController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 60)),
    );
    if (picked != null) setState(() => _fechaPreferida = picked);
  }

  Future<void> _submit() async {
    if (_fechaPreferida == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona una fecha preferida.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      await SolicitudTallerService.createCambioAceite(
        userId: widget.userId,
        userMotoCompraId: widget.compra.id,
        fechaPreferida: _fechaPreferida!,
        notasCliente: _notasController.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cambio de aceite agendado.')),
      );
      Navigator.of(context).pop(true);
    } on SolicitudTallerException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final pad = Responsive.horizontalPadding(context);
    final compra = widget.compra;

    return Scaffold(
      backgroundColor: AppColors.surfaceContainerLowest,
      appBar: AppBar(
        title: const Text('Agendar cambio de aceite'),
        backgroundColor: AppColors.surfaceContainerLowest,
      ),
      body: ListView(
        padding: EdgeInsets.all(pad),
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.outline.withValues(alpha: 0.15)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${compra.modelo} · ${compra.color}',
                  style: AppTypography.labelMd.copyWith(fontWeight: FontWeight.w600),
                ),
                if (compra.placa?.trim().isNotEmpty == true)
                  Text('Placa: ${compra.placa!.trim()}'),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Fecha preferida',
            style: AppTypography.labelMd.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: AppSpacing.sm),
          OutlinedButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.calendar_month_outlined),
            label: Text(
              _fechaPreferida != null
                  ? _formatDate(_fechaPreferida!)
                  : 'Seleccionar fecha',
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Notas (opcional)',
            style: AppTypography.labelMd.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: _notasController,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'Horario preferido, observaciones...',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          FilledButton(
            onPressed: _isSubmitting ? null : _submit,
            child: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Agendar'),
          ),
        ],
      ),
    );
  }
}
