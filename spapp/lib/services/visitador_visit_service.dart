import 'package:flutter/foundation.dart';
import 'package:spapp/models/visita.dart';
import 'package:spapp/services/network_resilience.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class VisitadorVisitService {
  static const _bucket = 'visita-evidencias';

  static SupabaseClient get _client => Supabase.instance.client;

  static Future<List<Visita>> getAssignedVisits(int visitadorId) async {
    try {
      final result = await NetworkResilience.runWithRetry(
        () => _client.rpc(
          'get_visitas_asignadas',
          params: {'p_visitador_id': visitadorId},
        ),
        debugLabel: 'get_visitas_asignadas',
      );

      if (result is! List) return [];

      return result
          .map((row) => Visita.fromJson(Map<String, dynamic>.from(row as Map)))
          .toList();
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('get_visitas_asignadas failed: ${error.message}');
      }
      rethrow;
    }
  }

  static Future<String> uploadPhoto({
    required int visitadorId,
    required String visitaId,
    required Uint8List bytes,
    required String mimeType,
  }) async {
    return _uploadFile(
      visitadorId: visitadorId,
      visitaId: visitaId,
      folder: 'fotos',
      bytes: bytes,
      mimeType: mimeType,
    );
  }

  static Future<String> uploadVideo({
    required int visitadorId,
    required String visitaId,
    required Uint8List bytes,
    required String mimeType,
  }) async {
    return _uploadFile(
      visitadorId: visitadorId,
      visitaId: visitaId,
      folder: 'videos',
      bytes: bytes,
      mimeType: mimeType,
    );
  }

  static Future<String> _uploadFile({
    required int visitadorId,
    required String visitaId,
    required String folder,
    required Uint8List bytes,
    required String mimeType,
  }) async {
    if (bytes.isEmpty) {
      throw const VisitadorVisitException('El archivo está vacío.');
    }

    final extension = _extensionForMime(mimeType);
    final path =
        '$visitadorId/$visitaId/$folder/${DateTime.now().millisecondsSinceEpoch}.$extension';

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
        debugLabel: 'upload_visita_$folder',
      );

      return _client.storage.from(_bucket).getPublicUrl(path);
    } on StorageException catch (error) {
      throw VisitadorVisitException(
        NetworkResilience.isStorageTransient(error)
            ? 'Conexión lenta: no se pudo subir el archivo. Intenta de nuevo.'
            : 'No se pudo subir el archivo. ${error.message}',
      );
    } catch (error) {
      throw VisitadorVisitException(
        NetworkResilience.isTransientError(error)
            ? 'Conexión lenta: no se pudo subir el archivo. Intenta de nuevo.'
            : NetworkResilience.userFacingMessage(error),
      );
    }
  }

  static Future<void> completeVisit({
    required int visitadorId,
    required String visitaId,
    required List<VisitaEvidenciaFoto> fotos,
    required List<VisitaEvidenciaVideo> videos,
    required VisitaUbicacionVerificada ubicacion,
    String? notas,
  }) async {
    if (fotos.isEmpty) {
      throw const VisitadorVisitException(
        'Debes capturar al menos una foto de evidencia.',
      );
    }
    if (videos.isEmpty) {
      throw const VisitadorVisitException(
        'Debes capturar al menos un video de evidencia.',
      );
    }

    try {
      await NetworkResilience.runWithRetry(
        () => _client.rpc(
          'complete_visita_visitador',
          params: {
            'p_visitador_id': visitadorId,
            'p_visita_id': visitaId,
            'p_evidencia_fotos': fotos.map((f) => f.toJson()).toList(),
            'p_evidencia_videos': videos.map((v) => v.toJson()).toList(),
            'p_ubicacion_verificada': ubicacion.toJson(),
            'p_notas_visita': notas?.trim().isEmpty == true ? null : notas?.trim(),
          },
        ),
        debugLabel: 'complete_visita_visitador',
      );
    } on PostgrestException catch (error) {
      throw VisitadorVisitException(
        error.message.isNotEmpty
            ? error.message
            : 'No se pudo completar la visita.',
      );
    }
  }

  static RealtimeChannel subscribeToAssignedVisits({
    required int visitadorId,
    required VoidCallback onChanged,
  }) {
    final channel = _client.channel('visitador_visitas_$visitadorId');

    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'visitas',
          callback: (payload) {
            final newVisitadorId = payload.newRecord['visitador_id'];
            final oldVisitadorId = payload.oldRecord['visitador_id'];
            final matches = newVisitadorId == visitadorId ||
                newVisitadorId?.toString() == visitadorId.toString() ||
                oldVisitadorId == visitadorId ||
                oldVisitadorId?.toString() == visitadorId.toString();

            if (!matches) return;
            onChanged();
          },
        )
        .subscribe();

    return channel;
  }

  static Future<void> unsubscribe(RealtimeChannel? channel) async {
    if (channel == null) return;
    await _client.removeChannel(channel);
  }

  static String _extensionForMime(String mimeType) {
    switch (mimeType) {
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      case 'video/webm':
        return 'webm';
      case 'video/quicktime':
        return 'mov';
      default:
        return mimeType.startsWith('video/') ? 'mp4' : 'jpg';
    }
  }
}

class VisitadorVisitException implements Exception {
  const VisitadorVisitException(this.message);

  final String message;

  @override
  String toString() => message;
}
