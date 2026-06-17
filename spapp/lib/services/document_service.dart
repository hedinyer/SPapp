import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:spapp/models/user_document.dart';
import 'package:spapp/services/local_cache_service.dart';
import 'package:spapp/services/network_resilience.dart';
import 'package:spapp/models/document_photo_type.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DocumentService {
  static const _bucket = 'user-documents';

  static SupabaseClient get _client => Supabase.instance.client;

  static Future<String> uploadPhoto({
    required int userId,
    required DocumentPhotoType type,
    required Uint8List bytes,
    required String mimeType,
  }) async {
    if (bytes.isEmpty) {
      throw DocumentUploadException(
        'La foto de ${type.captureLabel} está vacía. Vuelve a capturarla.',
      );
    }

    final extension = _extensionForMime(mimeType);
    final path =
        '$userId/${type.storageKey}_${DateTime.now().millisecondsSinceEpoch}.$extension';

    try {
      await NetworkResilience.runWithRetry(
        () => _client.storage.from(_bucket).uploadBinary(
              path,
              bytes,
              fileOptions: FileOptions(
                contentType: mimeType,
                upsert: true,
              ),
            ),
        debugLabel: 'upload_${type.storageKey}',
      );

      return _client.storage.from(_bucket).getPublicUrl(path);
    } on StorageException catch (error) {
      if (kDebugMode) {
        debugPrint(
          'Storage upload failed (${type.storageKey}): ${error.message}',
        );
      }
      throw DocumentUploadException(
        NetworkResilience.isStorageTransient(error)
            ? 'Conexión lenta: no se pudo subir ${type.captureLabel}. '
                'Verifica tu señal e intenta de nuevo.'
            : 'No se pudo subir ${type.captureLabel}. ${error.message}',
      );
    } catch (error) {
      throw DocumentUploadException(
        NetworkResilience.isTransientError(error)
            ? 'Conexión lenta: no se pudo subir ${type.captureLabel}. '
                'Verifica tu señal e intenta de nuevo.'
            : NetworkResilience.userFacingMessage(error),
      );
    }
  }

  static Future<void> saveUserDocuments({
    required int userId,
    required String documentFrontUrl,
    required String documentBackUrl,
    required String selfieUrl,
  }) async {
    try {
      await NetworkResilience.runWithRetry(
        () => _client.from('users_documents').insert({
          'user_id': userId,
          'document_front_url': documentFrontUrl,
          'document_back_url': documentBackUrl,
          'selfie_url': selfieUrl,
          'estado_solicitud': SolicitudEstado.pendiente.name,
          'betado': false,
        }),
        debugLabel: 'save_user_documents',
      );
      await LocalCacheService.remove(LocalCacheService.userDocumentKey(userId));
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('users_documents insert failed: ${error.message}');
      }
      throw DocumentUploadException(
        error.message.isNotEmpty
            ? error.message
            : 'No se pudieron registrar los documentos en la base de datos.',
      );
    }
  }

  static RealtimeChannel subscribeToUserDocuments({
    required int userId,
    required void Function(PostgresChangePayload payload) onChanged,
  }) {
    final channel = _client.channel('user_documents_$userId');

    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'users_documents',
          callback: (payload) {
            final newUserId = payload.newRecord['user_id'];
            final oldUserId = payload.oldRecord['user_id'];
            final matchesUser = newUserId == userId ||
                newUserId?.toString() == userId.toString() ||
                oldUserId == userId ||
                oldUserId?.toString() == userId.toString();

            if (!matchesUser) return;

            if (kDebugMode) {
              debugPrint(
                'users_documents realtime (${payload.eventType.name}): '
                '${payload.newRecord}',
              );
            }

            unawaited(
              LocalCacheService.remove(LocalCacheService.userDocumentKey(userId)),
            );
            onChanged(payload);
          },
        )
        .subscribe((status, error) {
          if (kDebugMode) {
            debugPrint(
              'users_documents channel status: $status, error: $error',
            );
          }
        });

    return channel;
  }

  static Future<void> unsubscribe(RealtimeChannel? channel) async {
    if (channel != null) {
      await _client.removeChannel(channel);
    }
  }

  static Future<UserDocument?> getLatestUserDocument(
    int userId, {
    bool forceRefresh = false,
  }) async {
    return getLatestUserDocumentCached(userId, forceRefresh: forceRefresh);
  }

  static Future<UserDocument?> getLatestUserDocumentCached(
    int userId, {
    bool forceRefresh = false,
  }) async {
    final cacheKey = LocalCacheService.userDocumentKey(userId);

    if (!forceRefresh) {
      final cached = await LocalCacheService.getObject(
        cacheKey,
        UserDocument.fromJson,
      );
      if (cached != null) return cached;
    }

    try {
      final response = await NetworkResilience.runWithRetry(
        () => _client
            .from('users_documents')
            .select(
              'id, user_id, estado_solicitud, betado, motivo_rechazo, '
              'hora_actualizacion, created_at',
            )
            .eq('user_id', userId)
            .order('created_at', ascending: false)
            .limit(1)
            .maybeSingle(),
        debugLabel: 'users_documents',
      );

      if (response == null) {
        await LocalCacheService.remove(cacheKey);
        return null;
      }

      final json = Map<String, dynamic>.from(response);
      await LocalCacheService.setObject(cacheKey, json);
      return UserDocument.fromJson(json);
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('users_documents select failed: ${error.message}');
      }
    } catch (error) {
      if (kDebugMode) {
        debugPrint('users_documents select failed: $error');
      }
    }

    return LocalCacheService.getObject(cacheKey, UserDocument.fromJson);
  }

  static String _extensionForMime(String mimeType) {
    switch (mimeType) {
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'image/heic':
        return 'heic';
      default:
        return 'jpg';
    }
  }
}

class DocumentUploadException implements Exception {
  const DocumentUploadException(this.message);

  final String message;

  @override
  String toString() => message;
}
