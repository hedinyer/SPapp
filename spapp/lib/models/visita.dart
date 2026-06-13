import 'package:spapp/models/visitador.dart';

class VisitaEvidenciaFoto {
  const VisitaEvidenciaFoto({
    required this.url,
    required this.capturedAt,
  });

  final String url;
  final DateTime capturedAt;

  Map<String, dynamic> toJson() => {
        'url': url,
        'captured_at': capturedAt.toUtc().toIso8601String(),
      };

  factory VisitaEvidenciaFoto.fromJson(Map<String, dynamic> json) {
    return VisitaEvidenciaFoto(
      url: json['url'] as String,
      capturedAt: DateTime.parse(json['captured_at'] as String),
    );
  }
}

class VisitaEvidenciaVideo {
  const VisitaEvidenciaVideo({
    required this.url,
    required this.capturedAt,
    this.durationSec,
  });

  final String url;
  final DateTime capturedAt;
  final int? durationSec;

  Map<String, dynamic> toJson() => {
        'url': url,
        'captured_at': capturedAt.toUtc().toIso8601String(),
        if (durationSec != null) 'duration_sec': durationSec,
      };

  factory VisitaEvidenciaVideo.fromJson(Map<String, dynamic> json) {
    return VisitaEvidenciaVideo(
      url: json['url'] as String,
      capturedAt: DateTime.parse(json['captured_at'] as String),
      durationSec: json['duration_sec'] as int?,
    );
  }
}

class VisitaUbicacionVerificada {
  const VisitaUbicacionVerificada({
    required this.lat,
    required this.lng,
    required this.capturedAt,
    this.accuracy,
  });

  final double lat;
  final double lng;
  final DateTime capturedAt;
  final double? accuracy;

  Map<String, dynamic> toJson() => {
        'lat': lat,
        'lng': lng,
        'captured_at': capturedAt.toUtc().toIso8601String(),
        if (accuracy != null) 'accuracy': accuracy,
      };

  factory VisitaUbicacionVerificada.fromJson(Map<String, dynamic> json) {
    return VisitaUbicacionVerificada(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      capturedAt: DateTime.parse(json['captured_at'] as String),
      accuracy: (json['accuracy'] as num?)?.toDouble(),
    );
  }
}

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
    this.digitalContractId,
    this.visitadorId,
    required this.estado,
    this.clienteNombre,
    this.clienteCelular,
    this.direccionVisita,
    this.barrio,
    this.fechaProgramada,
    this.notas,
    this.visitador,
    this.evidenciaFotos = const [],
    this.evidenciaVideos = const [],
    this.ubicacionVerificada,
    this.fechaCompletada,
    this.notasVisita,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final int userId;
  final String? digitalContractId;
  final int? visitadorId;
  final VisitaEstado estado;
  final String? clienteNombre;
  final String? clienteCelular;
  final String? direccionVisita;
  final String? barrio;
  final DateTime? fechaProgramada;
  final String? notas;
  final Visitador? visitador;
  final List<VisitaEvidenciaFoto> evidenciaFotos;
  final List<VisitaEvidenciaVideo> evidenciaVideos;
  final VisitaUbicacionVerificada? ubicacionVerificada;
  final DateTime? fechaCompletada;
  final String? notasVisita;
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
      digitalContractId: json['digital_contract_id'] as String?,
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
      evidenciaFotos: _parseFotos(json['evidencia_fotos']),
      evidenciaVideos: _parseVideos(json['evidencia_videos']),
      ubicacionVerificada: _parseUbicacion(json['ubicacion_verificada']),
      fechaCompletada: json['fecha_completada'] != null
          ? DateTime.parse(json['fecha_completada'] as String)
          : null,
      notasVisita: json['notas_visita'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  static List<VisitaEvidenciaFoto> _parseFotos(dynamic raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => VisitaEvidenciaFoto.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  static List<VisitaEvidenciaVideo> _parseVideos(dynamic raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => VisitaEvidenciaVideo.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  static VisitaUbicacionVerificada? _parseUbicacion(dynamic raw) {
    if (raw is! Map) return null;
    return VisitaUbicacionVerificada.fromJson(Map<String, dynamic>.from(raw));
  }
}
