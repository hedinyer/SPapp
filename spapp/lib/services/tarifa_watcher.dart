import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:spapp/models/tarifa_pagada.dart';
import 'package:spapp/models/user_moto_compra.dart';
import 'package:spapp/services/tarifa_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class TarifaWatcher {
  TarifaWatcher({
    required this.userId,
    required this.compra,
    required this.onChanged,
  });

  final int userId;
  final UserMotoCompra compra;
  final ValueChanged<TarifaResumenPagos> onChanged;

  RealtimeChannel? _channel;
  bool _isDisposed = false;
  bool _initialDelivered = false;
  TarifaResumenPagos _lastResumen = TarifaResumenPagos.empty;

  void start() {
    _fetchResumen();
    _channel = TarifaService.subscribeToTarifas(
      userId: userId,
      onChanged: _fetchResumen,
    );
  }

  void dispose() {
    _isDisposed = true;
    TarifaService.unsubscribe(_channel);
    _channel = null;
  }

  Future<void> refresh() => _fetchResumen();

  Future<void> _fetchResumen() async {
    if (_isDisposed) return;

    final resumen = await TarifaService.getResumenPagos(
      userId: userId,
      compra: compra,
    );
    if (_isDisposed) return;

    final changed = !_initialDelivered ||
        _lastResumen.totalPagado != resumen.totalPagado ||
        _lastResumen.totalAdeudado != resumen.totalAdeudado ||
        _lastResumen.cuotasPagadas != resumen.cuotasPagadas ||
        _lastResumen.cuotasVencidas != resumen.cuotasVencidas ||
        _lastResumen.diasAtraso != resumen.diasAtraso;

    if (changed) {
      _initialDelivered = true;
      _lastResumen = resumen;
      onChanged(resumen);
    }
  }
}
