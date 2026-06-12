import 'package:flutter/foundation.dart';
import 'package:spapp/models/inventario_categoria.dart';
import 'package:spapp/models/inventario_producto.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class InventarioService {
  static SupabaseClient get _client => Supabase.instance.client;

  static Future<List<InventarioCategoria>> fetchCategorias() async {
    try {
      final response = await _client
          .from('inventario_categorias')
          .select()
          .eq('activo', true)
          .order('orden')
          .order('nombre');

      return (response as List)
          .map((row) => InventarioCategoria.fromJson(row as Map<String, dynamic>))
          .toList();
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('inventario_categorias select failed: ${error.message}');
      }
      return [];
    }
  }

  static Future<List<InventarioProducto>> fetchProductos({
    int? categoriaId,
  }) async {
    try {
      var query = _client
          .from('inventario_productos')
          .select()
          .eq('activo', true)
          .gt('stock', 0);

      if (categoriaId != null) {
        query = query.eq('categoria_id', categoriaId);
      }

      final response = await query.order('nombre');

      return (response as List)
          .map((row) => InventarioProducto.fromJson(row as Map<String, dynamic>))
          .toList();
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('inventario_productos select failed: ${error.message}');
      }
      return [];
    }
  }
}
