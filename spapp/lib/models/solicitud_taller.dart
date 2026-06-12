enum SolicitudTallerTipo {

  repuestos,

  reparacion,

  cambioAceite;



  static SolicitudTallerTipo fromDb(String value) {

    return switch (value) {

      'reparacion' => SolicitudTallerTipo.reparacion,

      'cambio_aceite' => SolicitudTallerTipo.cambioAceite,

      _ => SolicitudTallerTipo.repuestos,

    };

  }



  String get dbValue => switch (this) {

        SolicitudTallerTipo.repuestos => 'repuestos',

        SolicitudTallerTipo.reparacion => 'reparacion',

        SolicitudTallerTipo.cambioAceite => 'cambio_aceite',

      };



  String get label => switch (this) {

        SolicitudTallerTipo.repuestos => 'Repuestos',

        SolicitudTallerTipo.reparacion => 'Reparación',

        SolicitudTallerTipo.cambioAceite => 'Cambio de aceite',

      };

}



enum SolicitudTallerEstado {

  pendiente,

  enProceso,

  completada,

  cancelada;



  static SolicitudTallerEstado fromDb(String value) {

    return switch (value) {

      'en_proceso' => SolicitudTallerEstado.enProceso,

      'completada' => SolicitudTallerEstado.completada,

      'cancelada' => SolicitudTallerEstado.cancelada,

      _ => SolicitudTallerEstado.pendiente,

    };

  }



  String get dbValue => switch (this) {

        SolicitudTallerEstado.pendiente => 'pendiente',

        SolicitudTallerEstado.enProceso => 'en_proceso',

        SolicitudTallerEstado.completada => 'completada',

        SolicitudTallerEstado.cancelada => 'cancelada',

      };



  String get label => switch (this) {

        SolicitudTallerEstado.pendiente => 'Pendiente',

        SolicitudTallerEstado.enProceso => 'En proceso',

        SolicitudTallerEstado.completada => 'Completada',

        SolicitudTallerEstado.cancelada => 'Cancelada',

      };

}



class SolicitudRepuestoItem {

  const SolicitudRepuestoItem({

    required this.productoId,

    required this.nombre,

    required this.cantidad,

    required this.precioUnitario,

    required this.subtotal,

  });



  final int productoId;

  final String nombre;

  final int cantidad;

  final int precioUnitario;

  final int subtotal;



  factory SolicitudRepuestoItem.fromJson(Map<String, dynamic> json) {

    final producto = json['inventario_productos'] as Map<String, dynamic>?;



    return SolicitudRepuestoItem(

      productoId: json['producto_id'] as int,

      nombre: producto?['nombre'] as String? ?? 'Producto',

      cantidad: json['cantidad'] as int,

      precioUnitario: json['precio_unitario'] as int,

      subtotal: json['subtotal'] as int,

    );

  }

}



class SolicitudTaller {

  const SolicitudTaller({

    required this.id,

    required this.userId,

    this.userMotoCompraId,

    required this.tipo,

    required this.estado,

    this.notasCliente,

    this.notasAdmin,

    this.fechaPreferida,

    this.descripcionFalla,

    required this.totalEstimado,

    required this.createdAt,

    this.updatedAt,

    this.repuestoItems = const [],

  });



  final String id;

  final int userId;

  final String? userMotoCompraId;

  final SolicitudTallerTipo tipo;

  final SolicitudTallerEstado estado;

  final String? notasCliente;

  final String? notasAdmin;

  final DateTime? fechaPreferida;

  final String? descripcionFalla;

  final int totalEstimado;

  final DateTime createdAt;

  final DateTime? updatedAt;

  final List<SolicitudRepuestoItem> repuestoItems;



  bool get isActive =>

      estado == SolicitudTallerEstado.pendiente ||

      estado == SolicitudTallerEstado.enProceso;



  bool get isVisibleInHistory {

    if (isActive) return true;

    final cutoff = DateTime.now().subtract(const Duration(days: 30));

    return createdAt.isAfter(cutoff);

  }



  factory SolicitudTaller.fromJson(Map<String, dynamic> json) {

    final itemsRaw = json['solicitud_repuesto_items'] as List<dynamic>? ?? [];



    return SolicitudTaller(

      id: json['id'] as String,

      userId: json['user_id'] as int,

      userMotoCompraId: json['user_moto_compra_id'] as String?,

      tipo: SolicitudTallerTipo.fromDb(json['tipo'] as String? ?? ''),

      estado: SolicitudTallerEstado.fromDb(json['estado'] as String? ?? ''),

      notasCliente: json['notas_cliente'] as String?,

      notasAdmin: json['notas_admin'] as String?,

      fechaPreferida: json['fecha_preferida'] != null

          ? DateTime.parse(json['fecha_preferida'] as String)

          : null,

      descripcionFalla: json['descripcion_falla'] as String?,

      totalEstimado: json['total_estimado'] as int? ?? 0,

      createdAt: DateTime.parse(json['created_at'] as String),

      updatedAt: json['updated_at'] != null

          ? DateTime.parse(json['updated_at'] as String)

          : null,

      repuestoItems: itemsRaw

          .map(

            (item) => SolicitudRepuestoItem.fromJson(

              item as Map<String, dynamic>,

            ),

          )

          .toList(),

    );

  }

}


