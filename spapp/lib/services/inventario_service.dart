import 'package:flutter/foundation.dart';
import 'package:spapp/models/inventario_categoria.dart';
import 'package:spapp/models/inventario_producto.dart';
import 'package:spapp/services/local_cache_service.dart';
import 'package:spapp/services/network_resilience.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class InventarioService {
  static SupabaseClient get _client => Supabase.instance.client;

  static Future<List<InventarioCategoria>> fetchCategorias({
    bool forceRefresh = false,
  }) async {
    const cacheKey = 'inventario_categorias';

    if (!forceRefresh) {
      final cached = await LocalCacheService.getList(cacheKey);
      if (cached != null) {
        return cached.map(InventarioCategoria.fromJson).toList();
      }
    }

    try {
      final response = await NetworkResilience.runWithRetry(
        () => _client
            .from('inventario_categorias')
            .select()
            .eq('activo', true)
            .order('orden')
            .order('nombre'),
        debugLabel: 'inventario_categorias',
      );

      final rows = (response as List)
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList();
      await LocalCacheService.setList(cacheKey, rows);
      return rows.map(InventarioCategoria.fromJson).toList();
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('inventario_categorias select failed: ${error.message}');
      }
    } catch (error) {
      if (kDebugMode) {
        debugPrint('inventario_categorias select failed: $error');
      }
    }

    final cached = await LocalCacheService.getList(cacheKey);
    return cached?.map(InventarioCategoria.fromJson).toList() ?? [];
  }

  static Future<List<InventarioProducto>> fetchProductos({
    int? categoriaId,
    bool forceRefresh = false,
  }) async {
    final cacheKey =
        LocalCacheService.inventarioProductosKey(categoriaId);

    if (!forceRefresh) {
      final cached = await LocalCacheService.getList(cacheKey);
      if (cached != null) {
        return cached.map(InventarioProducto.fromJson).toList();
      }
    }

    try {
      final response = await NetworkResilience.runWithRetry(
        () async {
          var query = _client
              .from('inventario_productos')
              .select()
              .eq('activo', true)
              .gt('stock', 0);

          if (categoriaId != null) {
            query = query.eq('categoria_id', categoriaId);
          }

          return query.order('nombre');
        },
        debugLabel: 'inventario_productos',
      );

      final rows = (response as List)
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList();
      await LocalCacheService.setList(cacheKey, rows);
      return rows.map(InventarioProducto.fromJson).toList();
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('inventario_productos select failed: ${error.message}');
      }
    } catch (error) {
      if (kDebugMode) {
        debugPrint('inventario_productos select failed: $error');
      }
    }

    final cached = await LocalCacheService.getList(cacheKey);
    return cached?.map(InventarioProducto.fromJson).toList() ?? [];
  }
}
