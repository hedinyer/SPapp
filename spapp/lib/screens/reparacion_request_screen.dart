import 'package:flutter/material.dart';
import 'package:spapp/models/user_moto_compra.dart';
import 'package:spapp/services/solicitud_taller_service.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';

class ReparacionRequestScreen extends StatefulWidget {
  const ReparacionRequestScreen({
    super.key,
    required this.userId,
    required this.compra,
  });

  final int userId;
  final UserMotoCompra compra;

  @override
  State<ReparacionRequestScreen> createState() =>
      _ReparacionRequestScreenState();
}

class _ReparacionRequestScreenState extends State<ReparacionRequestScreen> {
  final _fallaController = TextEditingController();
  final _notasController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _fallaController.dispose();
    _notasController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);
    try {
      await SolicitudTallerService.createReparacion(
        userId: widget.userId,
        userMotoCompraId: widget.compra.id,
        descripcionFalla: _fallaController.text,
        notasCliente: _notasController.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Solicitud de reparación enviada.')),
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

  @override
  Widget build(BuildContext context) {
    final pad = Responsive.horizontalPadding(context);
    final compra = widget.compra;

    return Scaffold(
      backgroundColor: AppColors.surfaceContainerLowest,
      appBar: AppBar(
        title: const Text('Solicitar reparación'),
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
            'Describe la falla o el problema',
            style: AppTypography.labelMd.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: _fallaController,
            maxLines: 5,
            decoration: const InputDecoration(
              hintText: 'Ej: La moto pierde fuerza al acelerar...',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Notas adicionales (opcional)',
            style: AppTypography.labelMd.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: _notasController,
            maxLines: 3,
            decoration: const InputDecoration(
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
                : const Text('Enviar solicitud'),
          ),
        ],
      ),
    );
  }
}
