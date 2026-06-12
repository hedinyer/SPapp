import 'package:flutter/foundation.dart';

import 'package:spapp/models/inventario_producto.dart';

import 'package:spapp/models/solicitud_taller.dart';

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



  static Future<String> createRepuestosSolicitud({

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

      final result = await _client.rpc(

        'create_solicitud_repuestos',

        params: {

          'p_user_id': userId,

          'p_user_moto_compra_id': userMotoCompraId,

          'p_notas_cliente': notasCliente,

          'p_items': payload,

        },

      );



      return result as String;

    } on PostgrestException catch (error) {

      throw SolicitudTallerException(error.message);

    }

  }



  static Future<String> createReparacion({

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



    try {

      final response = await _client

          .from('solicitudes_taller')

          .insert({

            'user_id': userId,

            'user_moto_compra_id': userMotoCompraId,

            'tipo': SolicitudTallerTipo.reparacion.dbValue,

            'descripcion_falla': descripcionFalla.trim(),

            'notas_cliente': notasCliente?.trim(),

          })

          .select('id')

          .single();



      return response['id'] as String;

    } on PostgrestException catch (error) {

      throw SolicitudTallerException(error.message);

    }

  }



  static Future<String> createCambioAceite({

    required int userId,

    required String userMotoCompraId,

    required DateTime fechaPreferida,

    String? notasCliente,

  }) async {

    try {

      final response = await _client

          .from('solicitudes_taller')

          .insert({

            'user_id': userId,

            'user_moto_compra_id': userMotoCompraId,

            'tipo': SolicitudTallerTipo.cambioAceite.dbValue,

            'fecha_preferida': fechaPreferida.toIso8601String().split('T').first,

            'notas_cliente': notasCliente?.trim(),

          })

          .select('id')

          .single();



      return response['id'] as String;

    } on PostgrestException catch (error) {

      throw SolicitudTallerException(error.message);

    }

  }



  static Future<List<SolicitudTaller>> fetchMisSolicitudes(int userId) async {

    return getLatestSolicitudes(userId);

  }



  static Future<List<SolicitudTaller>> getLatestSolicitudes(int userId) async {

    try {

      final response = await _client

          .from('solicitudes_taller')

          .select(_selectWithItems)

          .eq('user_id', userId)

          .order('created_at', ascending: false);



      return (response as List)

          .map((row) => SolicitudTaller.fromJson(row as Map<String, dynamic>))

          .where((solicitud) => solicitud.isVisibleInHistory)

          .toList();

    } on PostgrestException catch (error) {

      if (kDebugMode) {

        debugPrint('solicitudes_taller select failed: ${error.message}');

      }

      return [];

    }

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



class SolicitudTallerException implements Exception {

  SolicitudTallerException(this.message);

  final String message;



  @override

  String toString() => message;

}


