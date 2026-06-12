class ContratoRentingForm {
  const ContratoRentingForm({
    this.nombreContratante = '',
    this.cedulaContratante = '',
    this.direccionNotificaciones = '',
    this.fechaFirmaDia = '',
    this.fechaFirmaMes = '',
    this.fechaFirmaAnio = '',
    this.clausulasAceptadas = false,
  });

  final String nombreContratante;
  final String cedulaContratante;
  final String direccionNotificaciones;
  final String fechaFirmaDia;
  final String fechaFirmaMes;
  final String fechaFirmaAnio;
  final bool clausulasAceptadas;

  bool get isComplete {
    if (nombreContratante.trim().isEmpty) return false;
    if (cedulaContratante.trim().isEmpty) return false;
    if (direccionNotificaciones.trim().isEmpty) return false;
    if (fechaFirmaDia.trim().isEmpty ||
        fechaFirmaMes.trim().isEmpty ||
        fechaFirmaAnio.trim().isEmpty) {
      return false;
    }
    return clausulasAceptadas;
  }

  ContratoRentingForm copyWith({
    String? nombreContratante,
    String? cedulaContratante,
    String? direccionNotificaciones,
    String? fechaFirmaDia,
    String? fechaFirmaMes,
    String? fechaFirmaAnio,
    bool? clausulasAceptadas,
  }) {
    return ContratoRentingForm(
      nombreContratante: nombreContratante ?? this.nombreContratante,
      cedulaContratante: cedulaContratante ?? this.cedulaContratante,
      direccionNotificaciones:
          direccionNotificaciones ?? this.direccionNotificaciones,
      fechaFirmaDia: fechaFirmaDia ?? this.fechaFirmaDia,
      fechaFirmaMes: fechaFirmaMes ?? this.fechaFirmaMes,
      fechaFirmaAnio: fechaFirmaAnio ?? this.fechaFirmaAnio,
      clausulasAceptadas: clausulasAceptadas ?? this.clausulasAceptadas,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'nombre_contratante': nombreContratante,
      'cedula_contratante': cedulaContratante,
      'direccion_notificaciones': direccionNotificaciones,
      'fecha_firma_dia': fechaFirmaDia,
      'fecha_firma_mes': fechaFirmaMes,
      'fecha_firma_anio': fechaFirmaAnio,
      'clausulas_aceptadas': clausulasAceptadas,
    };
  }

  factory ContratoRentingForm.fromJson(Map<String, dynamic> json) {
    return ContratoRentingForm(
      nombreContratante: json['nombre_contratante'] as String? ?? '',
      cedulaContratante: json['cedula_contratante'] as String? ?? '',
      direccionNotificaciones:
          json['direccion_notificaciones'] as String? ?? '',
      fechaFirmaDia: json['fecha_firma_dia'] as String? ?? '',
      fechaFirmaMes: json['fecha_firma_mes'] as String? ?? '',
      fechaFirmaAnio: json['fecha_firma_anio'] as String? ?? '',
      clausulasAceptadas: json['clausulas_aceptadas'] as bool? ?? false,
    );
  }
}
