enum SolicitudEstado {
  pendiente,
  aceptada,
  rechazada;

  static SolicitudEstado fromDb(String value) {
    return SolicitudEstado.values.firstWhere(
      (estado) => estado.name == value,
      orElse: () => SolicitudEstado.pendiente,
    );
  }
}

class UserDocument {
  const UserDocument({
    required this.id,
    required this.userId,
    required this.estadoSolicitud,
    required this.betado,
    this.motivoRechazo,
    this.horaActualizacion,
    required this.createdAt,
  });

  final int id;
  final int userId;
  final SolicitudEstado estadoSolicitud;
  final bool betado;
  final String? motivoRechazo;
  final DateTime? horaActualizacion;
  final DateTime createdAt;

  bool get canResubmit =>
      estadoSolicitud == SolicitudEstado.rechazada && !betado;

  bool get canFillContractForms =>
      estadoSolicitud == SolicitudEstado.aceptada;

  bool get blocksNewSubmission =>
      estadoSolicitud == SolicitudEstado.pendiente ||
      estadoSolicitud == SolicitudEstado.aceptada ||
      (estadoSolicitud == SolicitudEstado.rechazada && betado);

  String? get submissionBlockMessage {
    switch (estadoSolicitud) {
      case SolicitudEstado.pendiente:
        return 'Ya tienes una solicitud en proceso.';
      case SolicitudEstado.aceptada:
        return 'Tu solicitud ya fue aprobada.';
      case SolicitudEstado.rechazada:
        if (betado) {
          return 'No puedes volver a solicitar crédito.';
        }
        return null;
    }
  }

  factory UserDocument.fromJson(Map<String, dynamic> json) {
    return UserDocument(
      id: json['id'] as int,
      userId: json['user_id'] as int,
      estadoSolicitud: SolicitudEstado.fromDb(
        json['estado_solicitud'] as String? ?? 'pendiente',
      ),
      betado: json['betado'] as bool? ?? false,
      motivoRechazo: json['motivo_rechazo'] as String?,
      horaActualizacion: json['hora_actualizacion'] != null
          ? DateTime.parse(json['hora_actualizacion'] as String).toUtc()
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
