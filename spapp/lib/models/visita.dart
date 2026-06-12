import 'package:spapp/models/visitador.dart';

enum VisitaEstado {
  pendienteAsignacion,
  asignada,
  completada,
  cancelada;

  static VisitaEstado fromDb(String value) {
    return switch (value) {
      'pendiente_asignacion' => VisitaEstado.pendienteAsignacion,
      'asignada' => VisitaEstado.asignada,
      'completada' => VisitaEstado.completada,
      'cancelada' => VisitaEstado.cancelada,
      _ => VisitaEstado.pendienteAsignacion,
    };
  }

  String get dbValue => switch (this) {
        VisitaEstado.pendienteAsignacion => 'pendiente_asignacion',
        VisitaEstado.asignada => 'asignada',
        VisitaEstado.completada => 'completada',
        VisitaEstado.cancelada => 'cancelada',
      };
}

class Visita {
  const Visita({
    required this.id,
    required this.userId,
    required this.digitalContractId,
    this.visitadorId,
    required this.estado,
    this.clienteNombre,
    this.clienteCelular,
    this.direccionVisita,
    this.barrio,
    this.fechaProgramada,
    this.notas,
    this.visitador,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final int userId;
  final String digitalContractId;
  final int? visitadorId;
  final VisitaEstado estado;
  final String? clienteNombre;
  final String? clienteCelular;
  final String? direccionVisita;
  final String? barrio;
  final DateTime? fechaProgramada;
  final String? notas;
  final Visitador? visitador;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isActive =>
      estado == VisitaEstado.pendienteAsignacion ||
      estado == VisitaEstado.asignada;

  String get direccionCompleta {
    final parts = [
      direccionVisita?.trim(),
      barrio?.trim(),
    ].where((p) => p != null && p.isNotEmpty).toList();
    return parts.join(', ');
  }

  factory Visita.fromJson(Map<String, dynamic> json) {
    final visitadorRaw = json['visitadores'];
    Visitador? visitador;
    if (visitadorRaw is Map<String, dynamic>) {
      visitador = Visitador.fromJson(visitadorRaw);
    }

    return Visita(
      id: json['id'] as String,
      userId: json['user_id'] as int,
      digitalContractId: json['digital_contract_id'] as String,
      visitadorId: json['visitador_id'] as int?,
      estado: VisitaEstado.fromDb(json['estado'] as String? ?? ''),
      clienteNombre: json['cliente_nombre'] as String?,
      clienteCelular: json['cliente_celular'] as String?,
      direccionVisita: json['direccion_visita'] as String?,
      barrio: json['barrio'] as String?,
      fechaProgramada: json['fecha_programada'] != null
          ? DateTime.parse(json['fecha_programada'] as String)
          : null,
      notas: json['notas'] as String?,
      visitador: visitador,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}
