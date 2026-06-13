import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Caché local JSON para mostrar datos al instante mientras la red responde.
class LocalCacheService {
  LocalCacheService._();

  static const _prefix = 'cache_v1_';

  static Future<T?> getObject<T>(
    String key,
    T Function(Map<String, dynamic> json) fromJson,
  ) async {
    final raw = await _readRaw(key);
    if (raw == null) return null;
    try {
      return fromJson(Map<String, dynamic>.from(jsonDecode(raw) as Map));
    } catch (_) {
      await remove(key);
      return null;
    }
  }

  static Future<void> setObject(String key, Map<String, dynamic> json) async {
    await _writeRaw(key, jsonEncode(json));
  }

  static Future<List<Map<String, dynamic>>?> getList(String key) async {
    final raw = await _readRaw(key);
    if (raw == null) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return null;
      return decoded
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
    } catch (_) {
      await remove(key);
      return null;
    }
  }

  static Future<void> setList(
    String key,
    List<Map<String, dynamic>> items,
  ) async {
    await _writeRaw(key, jsonEncode(items));
  }

  static Future<int?> getInt(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt('$_prefix$key');
  }

  static Future<void> setInt(String key, int value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('$_prefix$key', value);
  }

  static Future<void> remove(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$_prefix$key');
  }

  static Future<void> removePrefix(String prefix) async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs
        .getKeys()
        .where((key) => key.startsWith('$_prefix$prefix'))
        .toList();
    for (final key in keys) {
      await prefs.remove(key);
    }
  }

  static String userDocumentKey(int userId) => 'user_document_$userId';
  static String userMotoCompraKey(int userId) => 'user_moto_compra_$userId';
  static String creditCountKey(int userId) => 'credit_count_$userId';
  static String inventarioCategoriasKey() => 'inventario_categorias';
  static String inventarioProductosKey(int? categoriaId) =>
      'inventario_productos_${categoriaId ?? 'all'}';
  static String solicitudesKey(int userId) => 'solicitudes_taller_$userId';

  static Future<String?> _readRaw(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('$_prefix$key');
  }

  static Future<void> _writeRaw(String key, String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_prefix$key', value);
  }
}
