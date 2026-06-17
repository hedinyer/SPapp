import 'package:flutter/material.dart';
import 'package:spapp/models/user_moto_compra.dart';
import 'package:spapp/models/visita.dart';
import 'package:spapp/screens/moto_selection_screen.dart';
import 'package:spapp/services/moto_compra_watcher.dart';
import 'package:spapp/services/visit_assignment_watcher.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';
import 'package:spapp/widgets/moto_purchase_status_card.dart';
import 'package:spapp/widgets/visit_assignment_status_card.dart';

/// Coordina el flujo post-contrato: moto, pago, entrega y visita domiciliaria.
class PostVisitFlowSection extends StatefulWidget {
  const PostVisitFlowSection({
    super.key,
    required this.userId,
    this.digitalContractId,
    this.username,
    this.onCompraChanged,
  });

  final int userId;
  final String? digitalContractId;
  final String? username;
  final ValueChanged<UserMotoCompra?>? onCompraChanged;

  @override
  State<PostVisitFlowSection> createState() => _PostVisitFlowSectionState();
}

class _PostVisitFlowSectionState extends State<PostVisitFlowSection> {
  Visita? _visita;
  bool _isVisitLoading = false;
  bool _isCompraLoading = true;
  UserMotoCompra? _compra;
  VisitAssignmentWatcher? _visitWatcher;
  MotoCompraWatcher? _compraWatcher;

  bool get _showVisitFlow => _compra?.isDelivered == true;

  bool get _compactVisitCard =>
      _visita?.estado == VisitaEstado.completada &&
      (_compra != null || _isCompraLoading);

  @override
  void initState() {
    super.initState();
    _startCompraWatcher();
  }

  @override
  void dispose() {
    _visitWatcher?.dispose();
    _compraWatcher?.dispose();
    super.dispose();
  }

  void _onVisitChanged(Visita? visit) {
    if (!mounted) return;

    setState(() {
      _visita = visit;
      _isVisitLoading = false;
    });
  }

  void _startCompraWatcher() {
    _compraWatcher?.dispose();
    setState(() => _isCompraLoading = true);
    _compraWatcher = MotoCompraWatcher(
      userId: widget.userId,
      onChanged: _onCompraChanged,
    )..start();
  }

  void _onCompraChanged(UserMotoCompra? compra) {
    if (!mounted) return;

    setState(() {
      _compra = compra;
      _isCompraLoading = false;
    });
    widget.onCompraChanged?.call(compra);

    if (compra?.isDelivered == true) {
      if (_visitWatcher == null) {
        _startVisitWatcher();
      }
    } else {
      _stopVisitWatcher();
      setState(() {
        _visita = null;
        _isVisitLoading = false;
      });
    }
  }

  void _startVisitWatcher() {
    _visitWatcher?.dispose();
    setState(() => _isVisitLoading = true);
    _visitWatcher = VisitAssignmentWatcher(
      userId: widget.userId,
      onChanged: _onVisitChanged,
    )..start();
  }

  void _stopVisitWatcher() {
    _visitWatcher?.dispose();
    _visitWatcher = null;
  }

  Future<void> _openMotoSelection() async {
    final contractId = widget.digitalContractId;
    if (contractId == null || contractId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se encontró el contrato asociado. Intenta más tarde.'),
        ),
      );
      return;
    }

    final selected = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => MotoSelectionScreen(
          userId: widget.userId,
          digitalContractId: contractId,
        ),
      ),
    );

    if (selected == true) {
      await _compraWatcher?.refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final motoKey = _isCompraLoading
        ? 'compra_loading'
        : _compra?.estado.dbValue ?? 'sin_compra';

    final visitKey = _isVisitLoading
        ? 'visit_loading'
        : _visita?.estado.dbValue ?? 'sin_visita';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 350),
          switchInCurve: Curves.easeOut,
          switchOutCurve: Curves.easeIn,
          child: MotoPurchaseStatusCard(
            key: ValueKey(motoKey),
            compra: _compra,
            isLoading: _isCompraLoading,
            onSelectMoto: _openMotoSelection,
            userId: widget.userId,
            username: widget.username,
          ),
        ),
        if (_showVisitFlow) ...[
          SizedBox(
            height: Responsive.lerp(
              context,
              min: AppSpacing.lg,
              max: AppSpacing.xl,
            ),
          ),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 350),
            switchInCurve: Curves.easeOut,
            switchOutCurve: Curves.easeIn,
            child: VisitAssignmentStatusCard(
              key: ValueKey(visitKey),
              visita: _visita,
              isLoading: _isVisitLoading,
              compactWhenCompleted: _compactVisitCard,
            ),
          ),
        ],
      ],
    );
  }
}
