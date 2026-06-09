enum DocumentPhotoType {
  front,
  back,
  selfie;

  String get storageKey {
    switch (this) {
      case DocumentPhotoType.front:
        return 'document_front';
      case DocumentPhotoType.back:
        return 'document_back';
      case DocumentPhotoType.selfie:
        return 'selfie';
    }
  }

  String get dbColumn {
    switch (this) {
      case DocumentPhotoType.front:
        return 'document_front_url';
      case DocumentPhotoType.back:
        return 'document_back_url';
      case DocumentPhotoType.selfie:
        return 'selfie_url';
    }
  }

  String get title {
    switch (this) {
      case DocumentPhotoType.front:
        return 'Documento frontal';
      case DocumentPhotoType.back:
        return 'Documento trasero';
      case DocumentPhotoType.selfie:
        return 'Selfie de verificación';
    }
  }

  String get instruction {
    switch (this) {
      case DocumentPhotoType.front:
        return 'Coloca el frente de tu cédula dentro del marco. Asegúrate de que la foto sea nítida y sin reflejos.';
      case DocumentPhotoType.back:
        return 'Voltea tu documento y captura el reverso. Todos los datos deben ser legibles.';
      case DocumentPhotoType.selfie:
        return 'Toma una selfie mirando a la cámara. Mantén tu rostro centrado y bien iluminado.';
    }
  }

  String get captureLabel {
    switch (this) {
      case DocumentPhotoType.front:
        return 'Frente del documento';
      case DocumentPhotoType.back:
        return 'Reverso del documento';
      case DocumentPhotoType.selfie:
        return 'Tu rostro';
    }
  }
}
