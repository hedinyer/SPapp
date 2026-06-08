import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  static const _sessionKey = 'auth_session';

  static SupabaseClient get _client => Supabase.instance.client;

  static Future<Map<String, dynamic>?> getStoredSession() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_sessionKey);
    if (raw == null) return null;

    try {
      return Map<String, dynamic>.from(jsonDecode(raw) as Map);
    } catch (_) {
      await prefs.remove(_sessionKey);
      return null;
    }
  }

  static Future<void> saveSession(Map<String, dynamic> user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _sessionKey,
      jsonEncode({
        'id': user['id'],
        'user': user['user'],
      }),
    );
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_sessionKey);
  }

  static Future<Map<String, dynamic>> login({
    required String username,
    required String password,
  }) async {
    final trimmedUsername = username.trim();
    if (trimmedUsername.isEmpty || password.isEmpty) {
      throw const LoginException('Ingresa usuario y contraseña.');
    }

    try {
      final result = await _client.rpc(
        'verify_login',
        params: {
          'p_user': trimmedUsername,
          'p_password': password,
        },
      );

      if (result == null) {
        throw const LoginException('Usuario o contraseña incorrectos.');
      }

      final user = _normalizeUser(result);
      if (user == null) {
        throw const LoginException('Usuario o contraseña incorrectos.');
      }

      await saveSession(user);
      return user;
    } on LoginException {
      rethrow;
    } on PostgrestException catch (error) {
      throw LoginException(
        error.message.isNotEmpty
            ? error.message
            : 'No se pudo conectar con el servidor.',
      );
    } catch (_) {
      throw const LoginException(
        'No se pudo iniciar sesión. Intenta de nuevo.',
      );
    }
  }

  static Map<String, dynamic>? _normalizeUser(dynamic result) {
    if (result is List) {
      if (result.isEmpty) return null;
      return Map<String, dynamic>.from(result.first as Map);
    }

    if (result is Map) {
      if (result.isEmpty) return null;
      return Map<String, dynamic>.from(result);
    }

    return null;
  }
}

class LoginException implements Exception {
  const LoginException(this.message);

  final String message;

  @override
  String toString() => message;
}
