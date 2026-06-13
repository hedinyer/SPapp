import 'package:flutter/foundation.dart';

import 'package:spapp/models/inventario_producto.dart';
import 'package:spapp/models/solicitud_taller.dart';
import 'package:spapp/services/local_cache_service.dart';
import 'package:spapp/services/network_resilience.dart';
import 'package:spapp/services/offline_queue_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SolicitudTallerService {
  static SupabaseClient get _client => Supabase.instance.client;

  static const _selectWithItems = '''
    *,
    solicitud_repuesto_items(
      producto_id,
      cantidad,
      precio_unitario,
      subtotal,
      inventario_productos(nombre)
    )
  ''';

  static Future<SolicitudSubmitResult> createRepuestosSolicitud({
    required int userId,
    required String userMotoCompraId,
    required List<CarritoItem> items,
    String? notasCliente,
  }) async {
    if (items.isEmpty) {
      throw SolicitudTallerException('Agrega productos al carrito.');
    }

    final payload = items
        .map(
          (item) => {
            'producto_id': item.producto.id,
            'cantidad': item.cantidad,
          },
        )
        .toList();

    try {
      final result = await NetworkResilience.runWithRetry(
        () => _client.rpc(
          'create_solicitud_repuestos',
          params: {
            'p_user_id': userId,
            'p_user_moto_compra_id': userMotoCompraId,
            'p_notas_cliente': notasCliente,
            'p_items': payload,
          },
        ),
        debugLabel: 'create_solicitud_repuestos',
      );

      await invalidateCache(userId);
      return SolicitudSubmitResult(id: result as String);
    } on PostgrestException catch (error) {
      if (NetworkResilience.isPostgrestTransient(error)) {
        await OfflineQueueService.enqueueRepuestos(
          userId: userId,
          userMotoCompraId: userMotoCompraId,
          items: payload,
          notasCliente: notasCliente,
        );
        return const SolicitudSubmitResult(queuedOffline: true);
      }
      throw SolicitudTallerException(error.message);
    } catch (error) {
      if (NetworkResilience.isTransientError(error)) {
        await OfflineQueueService.enqueueRepuestos(
          userId: userId,
          userMotoCompraId: userMotoCompraId,
          items: payload,
          notasCliente: notasCliente,
        );
        return const SolicitudSubmitResult(queuedOffline: true);
      }
      throw SolicitudTallerException(NetworkResilience.userFacingMessage(error));
    }
  }

  static Future<SolicitudSubmitResult> createReparacion({
    required int userId,
    required String userMotoCompraId,
    required String descripcionFalla,
    String? notasCliente,
  }) async {
    if (descripcionFalla.trim().length < 10) {
      throw SolicitudTallerException(
        'Describe la falla con al menos 10 caracteres.',
      );
    }

    final trimmedFalla = descripcionFalla.trim();
    final trimmedNotas = notasCliente?.trim();

    try {
      final response = await NetworkResilience.runWithRetry(
        () => _client
            .from('solicitudes_taller')
            .insert({
              'user_id': userId,
              'user_moto_compra_id': userMotoCompraId,
              'tipo': SolicitudTallerTipo.reparacion.dbValue,
              'descripcion_falla': trimmedFalla,
              'notas_cliente': trimmedNotas,
            })
            .select('id')
            .single(),
        debugLabel: 'create_reparacion',
      );

      await invalidateCache(userId);
      return SolicitudSubmitResult(id: response['id'] as String);
    } on PostgrestException catch (error) {
      if (NetworkResilience.isPostgrestTransient(error)) {
        await OfflineQueueService.enqueueReparacion(
          userId: userId,
          userMotoCompraId: userMotoCompraId,
          descripcionFalla: trimmedFalla,
          notasCliente: trimmedNotas,
        );
        return const SolicitudSubmitResult(queuedOffline: true);
      }
      throw SolicitudTallerException(error.message);
    } catch (error) {
      if (NetworkResilience.isTransientError(error)) {
        await OfflineQueueService.enqueueReparacion(
          userId: userId,
          userMotoCompraId: userMotoCompraId,
          descripcionFalla: trimmedFalla,
          notasCliente: trimmedNotas,
        );
        return const SolicitudSubmitResult(queuedOffline: true);
      }
      throw SolicitudTallerException(NetworkResilience.userFacingMessage(error));
    }
  }

  static Future<SolicitudSubmitResult> createCambioAceite({
    required int userId,
    required String userMotoCompraId,
    required DateTime fechaPreferida,
    String? notasCliente,
  }) async {
    final fecha = fechaPreferida.toIso8601String().split('T').first;
    final trimmedNotas = notasCliente?.trim();

    try {
      final response = await NetworkResilience.runWithRetry(
        () => _client
            .from('solicitudes_taller')
            .insert({
              'user_id': userId,
              'user_moto_compra_id': userMotoCompraId,
              'tipo': SolicitudTallerTipo.cambioAceite.dbValue,
              'fecha_preferida': fecha,
              'notas_cliente': trimmedNotas,
            })
            .select('id')
            .single(),
        debugLabel: 'create_cambio_aceite',
      );

      await invalidateCache(userId);
      return SolicitudSubmitResult(id: response['id'] as String);
    } on PostgrestException catch (error) {
      if (NetworkResilience.isPostgrestTransient(error)) {
        await OfflineQueueService.enqueueCambioAceite(
          userId: userId,
          userMotoCompraId: userMotoCompraId,
          fechaPreferida: fecha,
          notasCliente: trimmedNotas,
        );
        return const SolicitudSubmitResult(queuedOffline: true);
      }
      throw SolicitudTallerException(error.message);
    } catch (error) {
      if (NetworkResilience.isTransientError(error)) {
        await OfflineQueueService.enqueueCambioAceite(
          userId: userId,
          userMotoCompraId: userMotoCompraId,
          fechaPreferida: fecha,
          notasCliente: trimmedNotas,
        );
        return const SolicitudSubmitResult(queuedOffline: true);
      }
      throw SolicitudTallerException(NetworkResilience.userFacingMessage(error));
    }
  }

  static Future<List<SolicitudTaller>> fetchMisSolicitudes(int userId) async {
    return getLatestSolicitudes(userId);
  }

  static Future<List<SolicitudTaller>> getLatestSolicitudes(int userId) async {
    return getLatestSolicitudesCached(userId, forceRefresh: true);
  }

  static Future<List<SolicitudTaller>> getLatestSolicitudesCached(
    int userId, {
    bool forceRefresh = false,
  }) async {
    final cacheKey = LocalCacheService.solicitudesKey(userId);

    if (!forceRefresh) {
      final cached = await LocalCacheService.getList(cacheKey);
      if (cached != null) {
        return cached
            .map(SolicitudTaller.fromJson)
            .where((solicitud) => solicitud.isVisibleInHistory)
            .toList();
      }
    }

    try {
      final response = await NetworkResilience.runWithRetry(
        () => _client
            .from('solicitudes_taller')
            .select(_selectWithItems)
            .eq('user_id', userId)
            .order('created_at', ascending: false),
        debugLabel: 'solicitudes_taller',
      );

      final rows = (response as List)
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList();
      await LocalCacheService.setList(cacheKey, rows);

      return rows
          .map(SolicitudTaller.fromJson)
          .where((solicitud) => solicitud.isVisibleInHistory)
          .toList();
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('solicitudes_taller select failed: ${error.message}');
      }
    } catch (error) {
      if (kDebugMode) {
        debugPrint('solicitudes_taller select failed: $error');
      }
    }

    final cached = await LocalCacheService.getList(cacheKey);
    if (cached != null) {
      return cached
          .map(SolicitudTaller.fromJson)
          .where((solicitud) => solicitud.isVisibleInHistory)
          .toList();
    }
    return [];
  }

  static Future<void> invalidateCache(int userId) async {
    await LocalCacheService.remove(LocalCacheService.solicitudesKey(userId));
  }

  static RealtimeChannel subscribeToSolicitudes({
    required int userId,
    required VoidCallback onChanged,
  }) {
    final channel = _client.channel('solicitudes_taller_$userId');

    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'solicitudes_taller',
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
                'solicitudes_taller realtime (${payload.eventType.name}): '
                '${payload.newRecord}',
              );
            }
            onChanged();
          },
        )
        .subscribe((status, error) {
          if (kDebugMode) {
            debugPrint(
              'solicitudes_taller channel status: $status, error: $error',
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

class SolicitudSubmitResult {
  const SolicitudSubmitResult({this.id, this.queuedOffline = false});

  final String? id;
  final bool queuedOffline;
}

class SolicitudTallerException implements Exception {
  SolicitudTallerException(this.message);
  final String message;

  @override
  String toString() => message;
}
