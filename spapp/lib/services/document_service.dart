import 'package:flutter/foundation.dart';
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
