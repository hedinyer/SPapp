import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:spapp/models/user_moto_compra.dart';
import 'package:spapp/services/moto_compra_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class MotoCompraWatcher {
  MotoCompraWatcher({
    required this.userId,
    required this.onChanged,
    this.pollInterval = const Duration(seconds: 10),
  });

  final int userId;
  final ValueChanged<UserMotoCompra?> onChanged;
  final Duration pollInterval;

  RealtimeChannel? _channel;
  Timer? _pollTimer;
  UserMotoCompra? _lastCompra;
  bool _isDisposed = false;
  bool _initialDelivered = false;

  void start() {
    _fetchCompra();
    _channel = MotoCompraService.subscribeToCompras(
      userId: userId,
      onChanged: _fetchCompra,
    );
  }

  void dispose() {
    _isDisposed = true;
    _pollTimer?.cancel();
    _pollTimer = null;
    MotoCompraService.unsubscribe(_channel);
    _channel = null;
  }

  Future<void> refresh() => _fetchCompra();

  Future<void> _fetchCompra() async {
    if (_isDisposed) return;

    final compra = await MotoCompraService.getLatestCompra(userId);
    if (_isDisposed) return;

    final changed = _hasChanged(_lastCompra, compra);
    if (!_initialDelivered || changed) {
      _initialDelivered = true;
      _lastCompra = compra;
      onChanged(compra);
    }

    _syncPolling(compra);
  }

  void _syncPolling(UserMotoCompra? compra) {
    _pollTimer?.cancel();
    _pollTimer = null;

    if (_isDisposed) return;
    if (compra != null && !compra.isPendingPayment) return;

    _pollTimer = Timer.periodic(pollInterval, (_) {
      _fetchCompra();
    });
  }

  bool _hasChanged(UserMotoCompra? previous, UserMotoCompra? next) {
    if (previous == null && next == null) return false;
    if (previous == null || next == null) return true;

    return previous.id != next.id ||
        previous.estado != next.estado ||
        previous.pagoInicialConfirmado != next.pagoInicialConfirmado ||
        previous.pagoCuotaConfirmado != next.pagoCuotaConfirmado ||
        previous.placa != next.placa ||
        previous.chasis != next.chasis ||
        previous.referencia != next.referencia ||
        previous.fechaEntrega != next.fechaEntrega ||
        previous.updatedAt != next.updatedAt;
  }
}
