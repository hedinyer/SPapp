import 'dart:convert';

import 'package:flutter/foundation.dart';
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
    final trimmedPassword = password.trim();
    if (trimmedUsername.isEmpty || trimmedPassword.isEmpty) {
      throw const LoginException('Ingresa usuario y contraseña.');
    }

    try {
      final result = await _client.rpc(
        'verify_login',
        params: {
          'p_user': trimmedUsername,
          'p_password': trimmedPassword,
        },
      );

      final user = _normalizeUser(result);
      if (user == null) {
        throw const LoginException('Usuario o contraseña incorrectos.');
      }

      await saveSession(user);
      return user;
    } on LoginException {
      rethrow;
    } on PostgrestException catch (error) {
      debugPrint('Login PostgrestException: ${error.message}');
      throw LoginException(
        error.message.isNotEmpty
            ? error.message
            : 'No se pudo conectar con el servidor.',
      );
    } catch (error, stackTrace) {
      debugPrint('Login error: $error');
      debugPrint('$stackTrace');
      throw LoginException(_networkErrorMessage(error));
    }
  }

  static String _networkErrorMessage(Object error) {
    final message = error.toString().toLowerCase();
    if (message.contains('socket') ||
        message.contains('network') ||
        message.contains('connection') ||
        message.contains('host lookup') ||
        message.contains('failed host') ||
        message.contains('timed out') ||
        message.contains('internet')) {
      return 'Sin conexión a internet. Verifica tu red e intenta de nuevo.';
    }

    return 'No se pudo iniciar sesión. Intenta de nuevo.';
  }

  static Map<String, dynamic>? _normalizeUser(dynamic result) {
    if (result == null) return null;

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
