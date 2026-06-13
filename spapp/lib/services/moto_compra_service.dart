import 'package:flutter/foundation.dart';
import 'package:spapp/models/bike_inventory.dart';
import 'package:spapp/models/moto_payment_calculator.dart';
import 'package:spapp/models/user_moto_compra.dart';
import 'package:spapp/services/bike_service.dart';
import 'package:spapp/services/local_cache_service.dart';
import 'package:spapp/services/network_resilience.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class MotoCompraService {
  static SupabaseClient get _client => Supabase.instance.client;

  static Future<UserMotoCompra?> getLatestCompra(
    int userId, {
    bool forceRefresh = false,
  }) async {
    final cacheKey = LocalCacheService.userMotoCompraKey(userId);

    if (!forceRefresh) {
      final cached = await LocalCacheService.getObject(
        cacheKey,
        UserMotoCompra.fromJson,
      );
      if (cached != null) return cached;
    }

    try {
      final response = await NetworkResilience.runWithRetry(
        () => _client
            .from('user_moto_compra')
            .select()
            .eq('user_id', userId)
            .order('created_at', ascending: false)
            .limit(1)
            .maybeSingle(),
        debugLabel: 'user_moto_compra',
      );

      if (response == null) {
        await LocalCacheService.remove(cacheKey);
        return null;
      }

      final json = Map<String, dynamic>.from(response);
      await LocalCacheService.setObject(cacheKey, json);
      return UserMotoCompra.fromJson(json);
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('user_moto_compra select failed: ${error.message}');
      }
    } catch (error) {
      if (kDebugMode) {
        debugPrint('user_moto_compra select failed: $error');
      }
    }

    return LocalCacheService.getObject(cacheKey, UserMotoCompra.fromJson);
  }

  static Future<UserMotoCompra> createCompra({
    required int userId,
    required String digitalContractId,
    required BikeInventory bike,
    required FrecuenciaPago frecuencia,
  }) async {
    final freshBike = await BikeService.fetchById(bike.id);
    if (freshBike == null || !freshBike.isAvailable) {
      throw MotoCompraServiceException(
        'La moto seleccionada ya no está disponible.',
      );
    }

    final payment = MotoPaymentCalculator.calculate(
      bike: freshBike,
      frecuencia: frecuencia,
    );

    try {
      final response = await NetworkResilience.runWithRetry(
        () => _client
            .from('user_moto_compra')
            .insert({
              'user_id': userId,
              'digital_contract_id': digitalContractId,
              'bike_id': freshBike.id,
              'modelo': freshBike.modelo,
              'color': freshBike.color,
              'frecuencia_pago': frecuencia.dbValue,
              'cuota_inicial_monto': payment.cuotaInicialMonto,
              'monto_cuota_periodo': payment.montoCuotaPeriodo,
              'monto_total_primer_pago': payment.montoTotalPrimerPago,
              'estado': MotoCompraEstado.pendientePago.dbValue,
            })
            .select()
            .single(),
        debugLabel: 'create_user_moto_compra',
      );

      final json = Map<String, dynamic>.from(response);
      await LocalCacheService.setObject(
        LocalCacheService.userMotoCompraKey(userId),
        json,
      );
      return UserMotoCompra.fromJson(json);
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('user_moto_compra insert failed: ${error.message}');
      }
      throw MotoCompraServiceException(
        error.message.isNotEmpty
            ? error.message
            : 'No se pudo registrar tu selección.',
      );
    }
  }

  static RealtimeChannel subscribeToCompras({
    required int userId,
    required VoidCallback onChanged,
  }) {
    final channel = _client.channel('user_moto_compra_$userId');

    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'user_moto_compra',
          callback: (payload) {
            final newUserId = payload.newRecord['user_id'];
            final oldUserId = payload.oldRecord['user_id'];
            final matchesUser = newUserId == userId ||
                newUserId?.toString() == userId.toString() ||
                oldUserId == userId ||
                oldUserId?.toString() == userId.toString();

            if (!matchesUser) return;

            if (kDebugMode) {
              debugPrint(
                'user_moto_compra realtime (${payload.eventType.name}): '
                '${payload.newRecord}',
              );
            }
            onChanged();
          },
        )
        .subscribe((status, error) {
          if (kDebugMode) {
            debugPrint(
              'user_moto_compra channel status: $status, error: $error',
            );
          }
        });

    return channel;
  }

  static Future<void> unsubscribe(RealtimeChannel? channel) async {
    if (channel == null) return;
    await _client.removeChannel(channel);
  }
}

class MotoCompraServiceException implements Exception {
  const MotoCompraServiceException(this.message);

  final String message;

  @override
  String toString() => message;
}
