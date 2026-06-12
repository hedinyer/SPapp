import 'package:flutter/foundation.dart';
import 'package:spapp/models/document_photo_type.dart';
import 'package:spapp/models/user_document.dart';
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
      await _client.storage.from(_bucket).uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(
              contentType: mimeType,
              upsert: true,
            ),
          );

      return _client.storage.from(_bucket).getPublicUrl(path);
    } on StorageException catch (error) {
      if (kDebugMode) {
        debugPrint(
          'Storage upload failed (${type.storageKey}): ${error.message}',
        );
      }
      throw DocumentUploadException(
        'No se pudo subir ${type.captureLabel}. ${error.message}',
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
      await _client.from('users_documents').insert({
        'user_id': userId,
        'document_front_url': documentFrontUrl,
        'document_back_url': documentBackUrl,
        'selfie_url': selfieUrl,
        'estado_solicitud': SolicitudEstado.pendiente.name,
        'betado': false,
      });
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
    required VoidCallback onChanged,
  }) {
    return _client
        .channel('user_documents_$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'users_documents',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: userId.toString(),
          ),
          callback: (payload) {
            if (kDebugMode) {
              debugPrint(
                'users_documents realtime (${payload.eventType.name}): '
                '${payload.newRecord}',
              );
            }
            onChanged();
          },
        )
        .subscribe();
  }

  static Future<void> unsubscribe(RealtimeChannel? channel) async {
    if (channel != null) {
      await _client.removeChannel(channel);
    }
  }

  static Future<UserDocument?> getLatestUserDocument(int userId) async {
    try {
      final response = await _client
          .from('users_documents')
          .select(
            'id, user_id, estado_solicitud, betado, motivo_rechazo, '
            'hora_actualizacion, created_at',
          )
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(1)
          .maybeSingle();

      if (response == null) return null;
      return UserDocument.fromJson(response);
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('users_documents select failed: ${error.message}');
      }
      return null;
    }
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
