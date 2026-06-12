import 'package:flutter/foundation.dart';
import 'package:spapp/models/tarifa_pagada.dart';
import 'package:spapp/models/user_moto_compra.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class TarifaService {
  static SupabaseClient get _client => Supabase.instance.client;

  static Future<List<TarifaPagada>> fetchTarifas(int userId) async {
    try {
      final response = await _client
          .from('tarifas_pagadas')
          .select()
          .eq('user_id', userId)
          .order('numero_periodo');

      return (response as List)
          .map((row) => TarifaPagada.fromJson(row as Map<String, dynamic>))
          .toList();
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('tarifas_pagadas select failed: ${error.message}');
      }
      return [];
    }
  }

  static Future<TarifaResumenPagos> getResumenPagos({
    required int userId,
    required UserMotoCompra compra,
  }) async {
    final tarifas = await fetchTarifas(userId);
    if (tarifas.isEmpty) {
      var total = 0;
      if (compra.pagoInicialConfirmado) {
        total += compra.cuotaInicialMonto;
      }
      if (compra.pagoCuotaConfirmado) {
        total += compra.montoCuotaPeriodo;
      }
      return TarifaResumenPagos(
        totalPagado: total,
        totalAdeudado: 0,
        cuotasPagadas: compra.pagoCuotaConfirmado ? 1 : 0,
        cuotasPendientes: 0,
        cuotasVencidas: 0,
        enMora: false,
      );
    }

    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);

    var totalPagado = compra.pagoInicialConfirmado
        ? compra.cuotaInicialMonto
        : 0;
    var totalAdeudado = 0;
    var cuotasPagadas = 0;
    var cuotasPendientes = 0;
    var cuotasVencidas = 0;
    DateTime? proximoVencimiento;
    int? diasAtraso;

    for (final tarifa in tarifas) {
      switch (tarifa.estado) {
        case TarifaEstado.pagada:
          cuotasPagadas++;
          totalPagado += tarifa.montoPagado ?? tarifa.montoEsperado;
        case TarifaEstado.pendiente:
          cuotasPendientes++;
          proximoVencimiento ??= tarifa.fechaVencimiento;
        case TarifaEstado.vencida:
          cuotasVencidas++;
          totalAdeudado += tarifa.montoEsperado;
          final venc = DateTime(
            tarifa.fechaVencimiento.year,
            tarifa.fechaVencimiento.month,
            tarifa.fechaVencimiento.day,
          );
          final atraso = todayDate.difference(venc).inDays;
          if (diasAtraso == null || atraso > diasAtraso) {
            diasAtraso = atraso;
          }
      }
    }

    return TarifaResumenPagos(
      totalPagado: totalPagado,
      totalAdeudado: totalAdeudado,
      cuotasPagadas: cuotasPagadas,
      cuotasPendientes: cuotasPendientes,
      cuotasVencidas: cuotasVencidas,
      proximoVencimiento: proximoVencimiento,
      diasAtraso: diasAtraso,
      enMora: cuotasVencidas > 0 && (diasAtraso ?? 0) >= 3,
    );
  }

  static RealtimeChannel subscribeToTarifas({
    required int userId,
    required VoidCallback onChanged,
  }) {
    return _client
        .channel('tarifas_pagadas_$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'tarifas_pagadas',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: userId.toString(),
          ),
          callback: (_) => onChanged(),
        )
        .subscribe();
  }

  static Future<void> unsubscribe(RealtimeChannel? channel) async {
    if (channel != null) {
      await _client.removeChannel(channel);
    }
  }
}
