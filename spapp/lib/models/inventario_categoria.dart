class InventarioCategoria {
  const InventarioCategoria({
    required this.id,
    required this.nombre,
    required this.slug,
    this.descripcion,
    required this.activo,
    required this.orden,
  });

  final int id;
  final String nombre;
  final String slug;
  final String? descripcion;
  final bool activo;
  final int orden;

  factory InventarioCategoria.fromJson(Map<String, dynamic> json) {
    return InventarioCategoria(
      id: json['id'] as int,
      nombre: json['nombre'] as String,
      slug: json['slug'] as String,
      descripcion: json['descripcion'] as String?,
      activo: json['activo'] as bool? ?? true,
      orden: json['orden'] as int? ?? 0,
    );
  }
}
