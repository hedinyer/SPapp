enum FrecuenciaPago {
  diario,
  semanal,
  quincenal,
  mensual;

  static FrecuenciaPago fromDb(String value) {
    return FrecuenciaPago.values.firstWhere(
      (f) => f.name == value,
      orElse: () => FrecuenciaPago.diario,
    );
  }

  String get dbValue => name;

  String get label => switch (this) {
        FrecuenciaPago.diario => 'Diario',
        FrecuenciaPago.semanal => 'Semanal',
        FrecuenciaPago.quincenal => 'Quincenal',
        FrecuenciaPago.mensual => 'Mensual',
      };

  String get periodDescription => switch (this) {
        FrecuenciaPago.diario => 'por día',
        FrecuenciaPago.semanal => '7 días · por adelantado',
        FrecuenciaPago.quincenal => '15 días · por adelantado',
        FrecuenciaPago.mensual => '30 días · por adelantado',
      };
}

enum MotoCompraEstado {
  pendientePago,
  listaRetiro,
  entregada,
  cancelada;

  static MotoCompraEstado fromDb(String value) {
    return switch (value) {
      'pendiente_pago' => MotoCompraEstado.pendientePago,
      'lista_retiro' => MotoCompraEstado.listaRetiro,
      'entregada' => MotoCompraEstado.entregada,
      'cancelada' => MotoCompraEstado.cancelada,
      _ => MotoCompraEstado.pendientePago,
    };
  }

  String get dbValue => switch (this) {
        MotoCompraEstado.pendientePago => 'pendiente_pago',
        MotoCompraEstado.listaRetiro => 'lista_retiro',
        MotoCompraEstado.entregada => 'entregada',
        MotoCompraEstado.cancelada => 'cancelada',
      };
}

class UserMotoCompra {
  const UserMotoCompra({
    required this.id,
    required this.userId,
    this.digitalContractId,
    required this.bikeId,
    required this.modelo,
    required this.color,
    required this.frecuenciaPago,
    required this.cuotaInicialMonto,
    required this.montoCuotaPeriodo,
    required this.montoTotalPrimerPago,
    required this.estado,
    required this.pagoInicialConfirmado,
    required this.pagoCuotaConfirmado,
    this.pagoInicialConfirmadoAt,
    this.pagoCuotaConfirmadoAt,
    this.placa,
    this.chasis,
    this.referencia,
    this.fechaEntrega,
    required this.adminData,
    required this.seleccionadoAt,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final int userId;
  final String? digitalContractId;
  final int bikeId;
  final String modelo;
  final String color;
  final FrecuenciaPago frecuenciaPago;
  final int cuotaInicialMonto;
  final int montoCuotaPeriodo;
  final int montoTotalPrimerPago;
  final MotoCompraEstado estado;
  final bool pagoInicialConfirmado;
  final bool pagoCuotaConfirmado;
  final DateTime? pagoInicialConfirmadoAt;
  final DateTime? pagoCuotaConfirmadoAt;
  final String? placa;
  final String? chasis;
  final String? referencia;
  final DateTime? fechaEntrega;
  final Map<String, dynamic> adminData;
  final DateTime seleccionadoAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isPendingPayment => estado == MotoCompraEstado.pendientePago;

  bool get isReadyForPickup => estado == MotoCompraEstado.listaRetiro;

  bool get isDelivered => estado == MotoCompraEstado.entregada;

  bool get isActive =>
      estado == MotoCompraEstado.pendientePago ||
      estado == MotoCompraEstado.listaRetiro;

  factory UserMotoCompra.fromJson(Map<String, dynamic> json) {
    return UserMotoCompra(
      id: json['id'] as String,
      userId: json['user_id'] as int,
      digitalContractId: json['digital_contract_id'] as String?,
      bikeId: json['bike_id'] as int,
      modelo: json['modelo'] as String,
      color: json['color'] as String,
      frecuenciaPago: FrecuenciaPago.fromDb(
        json['frecuencia_pago'] as String? ?? 'diario',
      ),
      cuotaInicialMonto: json['cuota_inicial_monto'] as int,
      montoCuotaPeriodo: json['monto_cuota_periodo'] as int,
      montoTotalPrimerPago: json['monto_total_primer_pago'] as int,
      estado: MotoCompraEstado.fromDb(json['estado'] as String? ?? ''),
      pagoInicialConfirmado:
          json['pago_inicial_confirmado'] as bool? ?? false,
      pagoCuotaConfirmado: json['pago_cuota_confirmado'] as bool? ?? false,
      pagoInicialConfirmadoAt: json['pago_inicial_confirmado_at'] != null
          ? DateTime.parse(json['pago_inicial_confirmado_at'] as String)
          : null,
      pagoCuotaConfirmadoAt: json['pago_cuota_confirmado_at'] != null
          ? DateTime.parse(json['pago_cuota_confirmado_at'] as String)
          : null,
      placa: json['placa'] as String?,
      chasis: json['chasis'] as String?,
      referencia: json['referencia'] as String?,
      fechaEntrega: json['fecha_entrega'] != null
          ? DateTime.parse(json['fecha_entrega'] as String)
          : null,
      adminData: Map<String, dynamic>.from(
        json['admin_data'] as Map? ?? {},
      ),
      seleccionadoAt: DateTime.parse(json['seleccionado_at'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}
