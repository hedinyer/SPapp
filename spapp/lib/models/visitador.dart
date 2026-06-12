class Visitador {
  const Visitador({
    required this.id,
    required this.nombre,
    this.fotoUrl,
    this.telefono,
    this.activo = true,
  });

  final int id;
  final String nombre;
  final String? fotoUrl;
  final String? telefono;
  final bool activo;

  factory Visitador.fromJson(Map<String, dynamic> json) {
    return Visitador(
      id: json['id'] as int,
      nombre: json['nombre'] as String? ?? '',
      fotoUrl: json['foto_url'] as String?,
      telefono: json['telefono'] as String?,
      activo: json['activo'] as bool? ?? true,
    );
  }
}
