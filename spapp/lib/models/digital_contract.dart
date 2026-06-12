enum ContractFormStatus {
  borrador,
  completado,
  firmado;

  static ContractFormStatus fromDb(String value) {
    return ContractFormStatus.values.firstWhere(
      (s) => s.name == value,
      orElse: () => ContractFormStatus.borrador,
    );
  }
}

class DigitalContract {
  const DigitalContract({
    required this.id,
    required this.userId,
    this.usersDocumentsId,
    required this.status,
    required this.hojaVidaData,
    required this.contratoData,
    required this.adminData,
    this.signaturePath,
    this.hojaVidaPdfPath,
    this.contratoPdfPath,
    this.signedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final int userId;
  final int? usersDocumentsId;
  final ContractFormStatus status;
  final Map<String, dynamic> hojaVidaData;
  final Map<String, dynamic> contratoData;
  final Map<String, dynamic> adminData;
  final String? signaturePath;
  final String? hojaVidaPdfPath;
  final String? contratoPdfPath;
  final DateTime? signedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isSigned => status == ContractFormStatus.firmado;

  factory DigitalContract.fromJson(Map<String, dynamic> json) {
    return DigitalContract(
      id: json['id'] as String,
      userId: json['user_id'] as int,
      usersDocumentsId: json['users_documents_id'] as int?,
      status: ContractFormStatus.fromDb(json['status'] as String? ?? 'borrador'),
      hojaVidaData: Map<String, dynamic>.from(
        json['hoja_vida_data'] as Map? ?? {},
      ),
      contratoData: Map<String, dynamic>.from(
        json['contrato_data'] as Map? ?? {},
      ),
      adminData: Map<String, dynamic>.from(json['admin_data'] as Map? ?? {}),
      signaturePath: json['signature_path'] as String?,
      hojaVidaPdfPath: json['hoja_vida_pdf_path'] as String?,
      contratoPdfPath: json['contrato_pdf_path'] as String?,
      signedAt: json['signed_at'] != null
          ? DateTime.parse(json['signed_at'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'users_documents_id': usersDocumentsId,
      'status': status.name,
      'hoja_vida_data': hojaVidaData,
      'contrato_data': contratoData,
      'admin_data': adminData,
      'signature_path': signaturePath,
      'hoja_vida_pdf_path': hojaVidaPdfPath,
      'contrato_pdf_path': contratoPdfPath,
      'signed_at': signedAt?.toIso8601String(),
    };
  }
}
