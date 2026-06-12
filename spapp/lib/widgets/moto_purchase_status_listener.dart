import 'package:flutter/material.dart';
import 'package:spapp/models/user_moto_compra.dart';
import 'package:spapp/services/moto_compra_watcher.dart';
import 'package:spapp/widgets/moto_purchase_status_card.dart';

/// Escucha cambios en `user_moto_compra` vía Realtime y actualiza la tarjeta.
class MotoPurchaseStatusListener extends StatefulWidget {
  const MotoPurchaseStatusListener({
    super.key,
    required this.userId,
    required this.visitCompleted,
    this.onSelectMoto,
  });

  final int userId;
  final bool visitCompleted;
  final VoidCallback? onSelectMoto;

  @override
  State<MotoPurchaseStatusListener> createState() =>
      _MotoPurchaseStatusListenerState();
}

class _MotoPurchaseStatusListenerState extends State<MotoPurchaseStatusListener> {
  UserMotoCompra? _compra;
  bool _isLoading = true;
  MotoCompraWatcher? _watcher;

  @override
  void initState() {
    super.initState();
    if (widget.visitCompleted) {
      _startWatcher();
    } else {
      _isLoading = false;
    }
  }

  @override
  void didUpdateWidget(MotoPurchaseStatusListener oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.visitCompleted && !oldWidget.visitCompleted) {
      _startWatcher();
    } else if (!widget.visitCompleted && oldWidget.visitCompleted) {
      _stopWatcher();
      setState(() {
        _compra = null;
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _stopWatcher();
    super.dispose();
  }

  void _startWatcher() {
    _stopWatcher();
    setState(() => _isLoading = true);
    _watcher = MotoCompraWatcher(
      userId: widget.userId,
      onChanged: _onCompraChanged,
    )..start();
  }

  void _stopWatcher() {
    _watcher?.dispose();
    _watcher = null;
  }

  void _onCompraChanged(UserMotoCompra? compra) {
    if (!mounted) return;
    setState(() {
      _compra = compra;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.visitCompleted) {
      return const SizedBox.shrink();
    }

    final cardKey = _isLoading
        ? 'loading'
        : _compra?.estado.dbValue ?? 'sin_compra';

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 350),
      switchInCurve: Curves.easeOut,
      switchOutCurve: Curves.easeIn,
      child: MotoPurchaseStatusCard(
        key: ValueKey(cardKey),
        compra: _compra,
        isLoading: _isLoading,
        onSelectMoto: widget.onSelectMoto,
      ),
    );
  }
}
