class BikeInventory {
  const BikeInventory({
    required this.id,
    required this.modelo,
    required this.color,
    this.imagenUrl,
    required this.stock,
    required this.cuotaInicial,
    required this.cuotaDiaria,
    this.descripcion,
    required this.activo,
    required this.createdAt,
    required this.updatedAt,
  });

  final int id;
  final String modelo;
  final String color;
  final String? imagenUrl;
  final int stock;
  final int cuotaInicial;
  final int cuotaDiaria;
  final String? descripcion;
  final bool activo;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isAvailable => activo && stock > 0;

  String get displayName => '$modelo · $color';

  factory BikeInventory.fromJson(Map<String, dynamic> json) {
    return BikeInventory(
      id: json['id'] as int,
      modelo: json['modelo'] as String,
      color: json['color'] as String,
      imagenUrl: json['imagen_url'] as String?,
      stock: json['stock'] as int? ?? 0,
      cuotaInicial: json['cuota_inicial'] as int,
      cuotaDiaria: json['cuota_diaria'] as int? ?? 38000,
      descripcion: json['descripcion'] as String?,
      activo: json['activo'] as bool? ?? true,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}
