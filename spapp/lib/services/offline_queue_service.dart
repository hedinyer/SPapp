import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spapp/services/network_resilience.dart';
import 'package:spapp/services/solicitud_taller_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Cola persistente para solicitudes de taller cuando la red falla o es muy lenta.
class OfflineQueueService {
  OfflineQueueService._();

  static const _queueKey = 'offline_queue_v1';
  static bool _processing = false;

  static final ValueNotifier<int> pendingCount = ValueNotifier(0);

  static Future<void> init() async {
    pendingCount.value = (await _loadQueue()).length;
  }

  static Future<void> enqueueRepuestos({
    required int userId,
    required String userMotoCompraId,
    required List<Map<String, dynamic>> items,
    String? notasCliente,
  }) async {
    await _enqueue({
      'type': 'repuestos',
      'userId': userId,
      'userMotoCompraId': userMotoCompraId,
      'items': items,
      'notasCliente': notasCliente,
      'createdAt': DateTime.now().toUtc().toIso8601String(),
    });
  }

  static Future<void> enqueueReparacion({
    required int userId,
    required String userMotoCompraId,
    required String descripcionFalla,
    String? notasCliente,
  }) async {
    await _enqueue({
      'type': 'reparacion',
      'userId': userId,
      'userMotoCompraId': userMotoCompraId,
      'descripcionFalla': descripcionFalla,
      'notasCliente': notasCliente,
      'createdAt': DateTime.now().toUtc().toIso8601String(),
    });
  }

  static Future<void> enqueueCambioAceite({
    required int userId,
    required String userMotoCompraId,
    required String fechaPreferida,
    String? notasCliente,
  }) async {
    await _enqueue({
      'type': 'cambio_aceite',
      'userId': userId,
      'userMotoCompraId': userMotoCompraId,
      'fechaPreferida': fechaPreferida,
      'notasCliente': notasCliente,
      'createdAt': DateTime.now().toUtc().toIso8601String(),
    });
  }

  static Future<void> processQueue() async {
    if (_processing) return;
    _processing = true;

    try {
      var queue = await _loadQueue();
      if (queue.isEmpty) return;

      final remaining = <Map<String, dynamic>>[];

      for (final item in queue) {
        try {
          await _processItem(item);
        } catch (error) {
          if (NetworkResilience.isTransientError(error)) {
            remaining.add(item);
            break;
          }
          if (kDebugMode) {
            debugPrint('Offline queue descartó item inválido: $error');
          }
        }
      }

      if (remaining.length < queue.length) {
        final processedUserIds = queue
            .where((item) => !remaining.contains(item))
            .map((item) => item['userId'] as int?)
            .whereType<int>()
            .toSet();
        for (final userId in processedUserIds) {
          await SolicitudTallerService.invalidateCache(userId);
        }
      }

      await _saveQueue(remaining);
      pendingCount.value = remaining.length;
    } finally {
      _processing = false;
    }
  }

  static Future<void> _processItem(Map<String, dynamic> item) async {
    final type = item['type'] as String?;
    switch (type) {
      case 'repuestos':
        await NetworkResilience.runWithRetry(
          () => Supabase.instance.client.rpc(
            'create_solicitud_repuestos',
            params: {
              'p_user_id': item['userId'],
              'p_user_moto_compra_id': item['userMotoCompraId'],
              'p_notas_cliente': item['notasCliente'],
              'p_items': item['items'],
            },
          ),
          debugLabel: 'offline repuestos',
        );
      case 'reparacion':
        await NetworkResilience.runWithRetry(
          () => Supabase.instance.client.from('solicitudes_taller').insert({
            'user_id': item['userId'],
            'user_moto_compra_id': item['userMotoCompraId'],
            'tipo': 'reparacion',
            'descripcion_falla': item['descripcionFalla'],
            'notas_cliente': item['notasCliente'],
          }),
          debugLabel: 'offline reparacion',
        );
      case 'cambio_aceite':
        await NetworkResilience.runWithRetry(
          () => Supabase.instance.client.from('solicitudes_taller').insert({
            'user_id': item['userId'],
            'user_moto_compra_id': item['userMotoCompraId'],
            'tipo': 'cambio_aceite',
            'fecha_preferida': item['fechaPreferida'],
            'notas_cliente': item['notasCliente'],
          }),
          debugLabel: 'offline cambio aceite',
        );
      default:
        throw StateError('Tipo de cola desconocido: $type');
    }
  }

  static Future<void> _enqueue(Map<String, dynamic> item) async {
    final queue = await _loadQueue()..add(item);
    await _saveQueue(queue);
    pendingCount.value = queue.length;
  }

  static Future<List<Map<String, dynamic>>> _loadQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_queueKey);
    if (raw == null || raw.isEmpty) return [];

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return [];
      return decoded
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> _saveQueue(List<Map<String, dynamic>> queue) async {
    final prefs = await SharedPreferences.getInstance();
    if (queue.isEmpty) {
      await prefs.remove(_queueKey);
    } else {
      await prefs.setString(_queueKey, jsonEncode(queue));
    }
  }
}
