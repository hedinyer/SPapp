enum TarifaEstado {
  pendiente,
  pagada,
  vencida;

  static TarifaEstado fromDb(String value) {
    return TarifaEstado.values.firstWhere(
      (e) => e.name == value,
      orElse: () => TarifaEstado.pendiente,
    );
  }

  String get dbValue => name;
}

class TarifaPagada {
  const TarifaPagada({
    required this.id,
    required this.userMotoCompraId,
    required this.userId,
    required this.numeroPeriodo,
    required this.fechaVencimiento,
    required this.montoEsperado,
    this.montoPagado,
    required this.estado,
    this.pagadaAt,
    this.confirmadaPor,
    this.notas,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String userMotoCompraId;
  final int userId;
  final int numeroPeriodo;
  final DateTime fechaVencimiento;
  final int montoEsperado;
  final int? montoPagado;
  final TarifaEstado estado;
  final DateTime? pagadaAt;
  final String? confirmadaPor;
  final String? notas;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory TarifaPagada.fromJson(Map<String, dynamic> json) {
    return TarifaPagada(
      id: json['id'] as String,
      userMotoCompraId: json['user_moto_compra_id'] as String,
      userId: json['user_id'] as int,
      numeroPeriodo: json['numero_periodo'] as int,
      fechaVencimiento: DateTime.parse(json['fecha_vencimiento'] as String),
      montoEsperado: json['monto_esperado'] as int,
      montoPagado: json['monto_pagado'] as int?,
      estado: TarifaEstado.fromDb(json['estado'] as String? ?? 'pendiente'),
      pagadaAt: json['pagada_at'] != null
          ? DateTime.parse(json['pagada_at'] as String)
          : null,
      confirmadaPor: json['confirmada_por'] as String?,
      notas: json['notas'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}

class TarifaResumenPagos {
  const TarifaResumenPagos({
    required this.totalPagado,
    required this.totalAdeudado,
    required this.cuotasPagadas,
    required this.cuotasPendientes,
    required this.cuotasVencidas,
    this.proximoVencimiento,
    this.diasAtraso,
    required this.enMora,
  });

  final int totalPagado;
  final int totalAdeudado;
  final int cuotasPagadas;
  final int cuotasPendientes;
  final int cuotasVencidas;
  final DateTime? proximoVencimiento;
  final int? diasAtraso;
  final bool enMora;

  static const empty = TarifaResumenPagos(
    totalPagado: 0,
    totalAdeudado: 0,
    cuotasPagadas: 0,
    cuotasPendientes: 0,
    cuotasVencidas: 0,
    enMora: false,
  );
}
