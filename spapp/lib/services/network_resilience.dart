import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Utilidades para conexiones lentas o inestables: timeouts largos y reintentos.
class NetworkResilience {
  NetworkResilience._();

  static const defaultMaxAttempts = 4;
  static const baseRetryDelay = Duration(seconds: 2);

  /// Cliente HTTP con timeouts generosos para redes móviles lentas.
  static http.Client createHttpClient() {
    final ioClient = HttpClient()
      ..connectionTimeout = const Duration(seconds: 45)
      ..idleTimeout = const Duration(seconds: 120);
    return IOClient(ioClient);
  }

  static bool isTransientError(Object error) {
    if (error is SocketException) return true;
    if (error is TimeoutException) return true;
    if (error is HttpException) return true;
    if (error is HandshakeException) return true;

    final message = error.toString().toLowerCase();
    return message.contains('socket') ||
        message.contains('network') ||
        message.contains('connection') ||
        message.contains('host lookup') ||
        message.contains('failed host') ||
        message.contains('timed out') ||
        message.contains('timeout') ||
        message.contains('internet') ||
        message.contains('offline') ||
        message.contains('unreachable');
  }

  static bool isPostgrestTransient(PostgrestException error) {
    final code = error.code?.toLowerCase() ?? '';
    if (code == '57014') return true; // query canceled / timeout
    if (code.startsWith('08')) return true; // connection exceptions
    return isTransientError(error);
  }

  static bool isStorageTransient(StorageException error) {
    final status = error.statusCode;
    if (status == '408' || status == '429' || status == '502' ||
        status == '503' || status == '504') {
      return true;
    }
    return isTransientError(error);
  }

  /// Ejecuta [action] con reintentos exponenciales ante fallos transitorios.
  static Future<T> runWithRetry<T>(
    Future<T> Function() action, {
    int maxAttempts = defaultMaxAttempts,
    Duration initialDelay = baseRetryDelay,
    String? debugLabel,
  }) async {
    Object? lastError;

    for (var attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await action();
      } on PostgrestException catch (error) {
        lastError = error;
        if (!isPostgrestTransient(error) || attempt >= maxAttempts) rethrow;
      } on StorageException catch (error) {
        lastError = error;
        if (!isStorageTransient(error) || attempt >= maxAttempts) rethrow;
      } catch (error) {
        lastError = error;
        if (!isTransientError(error) || attempt >= maxAttempts) rethrow;
      }

      final delay = initialDelay * (1 << (attempt - 1));
      if (kDebugMode && debugLabel != null) {
        debugPrint(
          'Reintentando $debugLabel (intento ${attempt + 1}/$maxAttempts) '
          'en ${delay.inSeconds}s…',
        );
      }
      await Future<void>.delayed(delay);
    }

    throw lastError ?? Exception('Operación fallida tras $maxAttempts intentos.');
  }

  static String userFacingMessage(Object error) {
    if (isTransientError(error)) {
      return 'La conexión es muy lenta o inestable. '
          'Guardamos tu información y reintentaremos automáticamente.';
    }
    if (error is PostgrestException && error.message.isNotEmpty) {
      return error.message;
    }
    if (error is StorageException && error.message.isNotEmpty) {
      return error.message;
    }
    return 'No se pudo completar la operación. Intenta de nuevo.';
  }
}
