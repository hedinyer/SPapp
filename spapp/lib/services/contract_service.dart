import 'package:flutter/foundation.dart';
import 'package:spapp/models/contrato_renting_form.dart';
import 'package:spapp/models/digital_contract.dart';
import 'package:spapp/models/hoja_vida_form.dart';
import 'package:spapp/services/user_tracking_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ContractService {
  static const _bucket = 'contract-documents';

  static SupabaseClient get _client => Supabase.instance.client;

  static Future<DigitalContract?> getByUser({
    required int userId,
    int? usersDocumentsId,
  }) async {
    try {
      var query = _client
          .from('digital_contracts')
          .select()
          .eq('user_id', userId);

      if (usersDocumentsId != null) {
        query = query.eq('users_documents_id', usersDocumentsId);
      }

      final response = await query
          .order('created_at', ascending: false)
          .limit(1)
          .maybeSingle();

      if (response == null) return null;
      return DigitalContract.fromJson(response);
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('digital_contracts select failed: ${error.message}');
      }
      return null;
    }
  }

  static Future<DigitalContract> getOrCreate({
    required int userId,
    required int usersDocumentsId,
  }) async {
    final existing = await getByUser(
      userId: userId,
      usersDocumentsId: usersDocumentsId,
    );
    if (existing != null) return existing;

    try {
      final response = await _client
          .from('digital_contracts')
          .insert({
            'user_id': userId,
            'users_documents_id': usersDocumentsId,
            'status': ContractFormStatus.borrador.name,
          })
          .select()
          .single();

      return DigitalContract.fromJson(response);
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('digital_contracts insert failed: ${error.message}');
      }
      throw ContractServiceException(
        error.message.isNotEmpty
            ? error.message
            : 'No se pudo crear el registro del contrato.',
      );
    }
  }

  static Future<DigitalContract> saveHojaVidaDraft({
    required String contractId,
    required HojaVidaForm form,
  }) async {
    return _updateContract(
      contractId: contractId,
      patch: {'hoja_vida_data': form.toJson()},
    );
  }

  static Future<DigitalContract> saveContratoDraft({
    required String contractId,
    required ContratoRentingForm form,
  }) async {
    return _updateContract(
      contractId: contractId,
      patch: {'contrato_data': form.toJson()},
    );
  }

  static Future<DigitalContract> markCompleted({
    required String contractId,
    required HojaVidaForm hojaVida,
    required ContratoRentingForm contrato,
  }) async {
    return _updateContract(
      contractId: contractId,
      patch: {
        'hoja_vida_data': hojaVida.toJson(),
        'contrato_data': contrato.toJson(),
        'status': ContractFormStatus.completado.name,
      },
    );
  }

  static Future<DigitalContract> finalizeSigned({
    required String contractId,
    required int userId,
    required HojaVidaForm hojaVida,
    required ContratoRentingForm contrato,
    required Uint8List signatureBytes,
    required Uint8List hojaVidaPdf,
    required Uint8List contratoPdf,
  }) async {
    final signaturePath = '$userId/$contractId/signature.png';
    final hojaVidaPath = '$userId/$contractId/hoja_vida.pdf';
    final contratoPath = '$userId/$contractId/contrato.pdf';

    try {
      await _uploadBytes(
        path: signaturePath,
        bytes: signatureBytes,
        contentType: 'image/png',
      );
      await _uploadBytes(
        path: hojaVidaPath,
        bytes: hojaVidaPdf,
        contentType: 'application/pdf',
      );
      await _uploadBytes(
        path: contratoPath,
        bytes: contratoPdf,
        contentType: 'application/pdf',
      );
    } catch (error) {
      if (kDebugMode) debugPrint('Contract upload failed: $error');
      rethrow;
    }

    final contract = await _updateContract(
      contractId: contractId,
      patch: {
        'hoja_vida_data': hojaVida.toJson(),
        'contrato_data': contrato.toJson(),
        'signature_path': signaturePath,
        'hoja_vida_pdf_path': hojaVidaPath,
        'contrato_pdf_path': contratoPath,
        'status': ContractFormStatus.firmado.name,
        'signed_at': DateTime.now().toUtc().toIso8601String(),
      },
    );

    await UserTrackingService.ensureRow(userId: userId);
    await UserTrackingService.start(userId);

    return contract;
  }

  static Future<DigitalContract> _updateContract({
    required String contractId,
    required Map<String, dynamic> patch,
  }) async {
    try {
      final response = await _client
          .from('digital_contracts')
          .update(patch)
          .eq('id', contractId)
          .select()
          .single();

      return DigitalContract.fromJson(response);
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('digital_contracts update failed: ${error.message}');
      }
      throw ContractServiceException(
        error.message.isNotEmpty
            ? error.message
            : 'No se pudo guardar el contrato.',
      );
    }
  }

  static Future<void> _uploadBytes({
    required String path,
    required Uint8List bytes,
    required String contentType,
  }) async {
    if (bytes.isEmpty) {
      throw ContractServiceException('El archivo generado está vacío.');
    }

    try {
      await _client.storage.from(_bucket).uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(
              contentType: contentType,
              upsert: true,
            ),
          );
    } on StorageException catch (error) {
      if (kDebugMode) {
        debugPrint('contract storage upload failed ($path): ${error.message}');
      }
      throw ContractServiceException(
        'No se pudo subir el documento. ${error.message}',
      );
    }
  }

  static String publicUrl(String path) {
    return _client.storage.from(_bucket).getPublicUrl(path);
  }
}

class ContractServiceException implements Exception {
  const ContractServiceException(this.message);

  final String message;

  @override
  String toString() => message;
}
