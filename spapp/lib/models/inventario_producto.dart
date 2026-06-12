class InventarioProducto {
  const InventarioProducto({
    required this.id,
    required this.categoriaId,
    required this.sku,
    required this.nombre,
    this.descripcion,
    required this.precio,
    required this.stock,
    required this.stockMinimo,
    this.imagenUrl,
    required this.compatibleModelos,
    required this.activo,
  });

  final int id;
  final int categoriaId;
  final String sku;
  final String nombre;
  final String? descripcion;
  final int precio;
  final int stock;
  final int stockMinimo;
  final String? imagenUrl;
  final List<String> compatibleModelos;
  final bool activo;

  bool get isAvailable => activo && stock > 0;

  factory InventarioProducto.fromJson(Map<String, dynamic> json) {
    final modelos = json['compatible_modelos'];
    return InventarioProducto(
      id: json['id'] as int,
      categoriaId: json['categoria_id'] as int,
      sku: json['sku'] as String,
      nombre: json['nombre'] as String,
      descripcion: json['descripcion'] as String?,
      precio: json['precio'] as int,
      stock: json['stock'] as int,
      stockMinimo: json['stock_minimo'] as int? ?? 0,
      imagenUrl: json['imagen_url'] as String?,
      compatibleModelos: modelos is List
          ? modelos.map((e) => e.toString()).toList()
          : const [],
      activo: json['activo'] as bool? ?? true,
    );
  }
}

class CarritoItem {
  const CarritoItem({required this.producto, required this.cantidad});

  final InventarioProducto producto;
  final int cantidad;

  int get subtotal => producto.precio * cantidad;

  CarritoItem copyWith({int? cantidad}) {
    return CarritoItem(
      producto: producto,
      cantidad: cantidad ?? this.cantidad,
    );
  }
}
