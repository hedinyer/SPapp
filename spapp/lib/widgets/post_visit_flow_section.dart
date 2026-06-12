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

/// Coordina tarjetas de visita completada y flujo de selección/compra de moto.
class PostVisitFlowSection extends StatefulWidget {
  const PostVisitFlowSection({
    super.key,
    required this.userId,
    this.digitalContractId,
    this.username,
    this.onCompraChanged,
    this.motoEntregada = false,
  });

  final int userId;
  final String? digitalContractId;
  final String? username;
  final ValueChanged<UserMotoCompra?>? onCompraChanged;
  final bool motoEntregada;

  @override
  State<PostVisitFlowSection> createState() => _PostVisitFlowSectionState();
}

class _PostVisitFlowSectionState extends State<PostVisitFlowSection> {
  Visita? _visita;
  bool _isVisitLoading = true;
  bool _isCompraLoading = true;
  UserMotoCompra? _compra;
  VisitAssignmentWatcher? _visitWatcher;
  MotoCompraWatcher? _compraWatcher;

  bool get _visitCompleted =>
      _visita?.estado == VisitaEstado.completada;

  bool get _showMotoFlow => _visitCompleted;

  bool get _compactVisitCard =>
      _visitCompleted && (_compra != null || _isCompraLoading);

  @override
  void initState() {
    super.initState();
    if (widget.motoEntregada) {
      _isVisitLoading = false;
      _startCompraWatcher();
    } else {
      _visitWatcher = VisitAssignmentWatcher(
        userId: widget.userId,
        onChanged: _onVisitChanged,
      )..start();
    }
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

    final isCompleted = visit?.estado == VisitaEstado.completada;
    if (isCompleted) {
      if (_compraWatcher == null) {
        _startCompraWatcher();
      }
    } else {
      _stopCompraWatcher();
      setState(() {
        _compra = null;
        _isCompraLoading = false;
      });
    }
  }

  void _startCompraWatcher() {
    _compraWatcher?.dispose();
    setState(() => _isCompraLoading = true);
    _compraWatcher = MotoCompraWatcher(
      userId: widget.userId,
      onChanged: (compra) {
        if (!mounted) return;
        setState(() {
          _compra = compra;
          _isCompraLoading = false;
        });
        widget.onCompraChanged?.call(compra);
      },
    )..start();
  }

  void _stopCompraWatcher() {
    _compraWatcher?.dispose();
    _compraWatcher = null;
  }

  Future<void> _openMotoSelection() async {
    final contractId =
        widget.digitalContractId ?? _visita?.digitalContractId;
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
    final visitKey = _isVisitLoading
        ? 'visit_loading'
        : _visita?.estado.dbValue ?? 'sin_visita';

    final motoKey = _isCompraLoading
        ? 'compra_loading'
        : _compra?.estado.dbValue ?? 'sin_compra';

    final hideVisit = widget.motoEntregada || _compra?.isDelivered == true;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!hideVisit)
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
        if (_showMotoFlow || hideVisit) ...[
          if (!hideVisit) ...[
            SizedBox(
              height: Responsive.lerp(
                context,
                min: AppSpacing.lg,
                max: AppSpacing.xl,
              ),
            ),
          ],
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
        ],
      ],
    );
  }
}
