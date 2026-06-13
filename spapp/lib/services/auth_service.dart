import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spapp/services/network_resilience.dart';
import 'package:spapp/services/user_tracking_service.dart';
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
        if (user['status'] != null) 'status': user['status'],
        if (user['visitador_id'] != null) 'visitador_id': user['visitador_id'],
      }),
    );
  }

  static Future<void> logout() async {
    await UserTrackingService.stop();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_sessionKey);
    await prefs.remove(UserTrackingService.prefsUserIdKey);
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
      final result = await NetworkResilience.runWithRetry(
        () => _client.rpc(
          'verify_login',
          params: {
            'p_user': trimmedUsername,
            'p_password': trimmedPassword,
          },
        ),
        debugLabel: 'verify_login',
      );

      final user = _normalizeUser(result);
      if (user == null) {
        throw const LoginException('Usuario o contraseña incorrectos.');
      }

      final status = user['status'] as String? ?? 'normal';
      if (status == 'admin') {
        throw const LoginException(
          'Esta cuenta es de administrador. Usa el panel web.',
        );
      }

      if (status == 'visitador') {
        final visitadorId = await _resolveVisitadorId(user['id']);
        if (visitadorId == null) {
          throw const LoginException(
            'Tu cuenta de visitador no está vinculada. Contacta al administrador.',
          );
        }
        user['visitador_id'] = visitadorId;
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

  static Future<int?> _resolveVisitadorId(dynamic userId) async {
    final parsedId = userId is int ? userId : int.tryParse('$userId');
    if (parsedId == null || parsedId <= 0) return null;

    try {
      final row = await _client
          .from('visitadores')
          .select('id')
          .eq('user_id', parsedId)
          .eq('activo', true)
          .maybeSingle();
      if (row == null) return null;
      return row['id'] as int?;
    } catch (_) {
      return null;
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
}

class LoginException implements Exception {
  const LoginException(this.message);

  final String message;

  @override
  String toString() => message;
}
