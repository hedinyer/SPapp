import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:spapp/models/document_photo_type.dart';
import 'package:spapp/services/document_service.dart';
import 'package:spapp/services/media_permission_service.dart';
import 'package:spapp/theme/app_theme.dart';

class IdentityVerificationScreen extends StatefulWidget {
  const IdentityVerificationScreen({
    super.key,
    required this.userId,
    this.motorcycleName,
  });

  final int userId;
  final String? motorcycleName;

  @override
  State<IdentityVerificationScreen> createState() =>
      _IdentityVerificationScreenState();
}

class _IdentityVerificationScreenState
    extends State<IdentityVerificationScreen> {
  static const _steps = [
    DocumentPhotoType.front,
    DocumentPhotoType.back,
    DocumentPhotoType.selfie,
  ];

  final _picker = ImagePicker();
  final _photos = <DocumentPhotoType, Uint8List>{};
  final _mimeTypes = <DocumentPhotoType, String>{};

  int _currentStep = 0;
  bool _isSubmitting = false;

  DocumentPhotoType get _activeType => _steps[_currentStep];

  bool get _allPhotosCaptured =>
      _photos.containsKey(DocumentPhotoType.front) &&
      _photos.containsKey(DocumentPhotoType.back) &&
      _photos.containsKey(DocumentPhotoType.selfie);

  bool get _isReviewStep => _currentStep >= _steps.length;

  Future<void> _pickPhoto(ImageSource source) async {
    final accessType = source == ImageSource.camera
        ? MediaAccessType.camera
        : MediaAccessType.gallery;

    final granted = await MediaPermissionService.ensureAccess(
      accessType,
      context: context,
    );
    if (!granted || !mounted) return;

    final isSelfie = _activeType == DocumentPhotoType.selfie;

    try {
      final file = await _picker.pickImage(
        source: source,
        preferredCameraDevice:
            isSelfie ? CameraDevice.front : CameraDevice.rear,
        imageQuality: 85,
        maxWidth: isSelfie ? 1200 : 2000,
      );

      if (file == null || !mounted) return;

      final bytes = await file.readAsBytes();
      final mime = _mimeFromPath(file.path);

      setState(() {
        _photos[_activeType] = bytes;
        _mimeTypes[_activeType] = mime;
      });
    } catch (_) {
      if (!mounted) return;
      final message = source == ImageSource.camera
          ? 'No se pudo abrir la cámara. Revisa los permisos e intenta de nuevo.'
          : 'No se pudo abrir la galería. Revisa los permisos e intenta de nuevo.';
      _showMessage(message);
    }
  }

  String _mimeFromPath(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic')) return 'image/heic';
    return 'image/jpeg';
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: AppTypography.bodySm.copyWith(color: AppColors.onPrimary),
        ),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(AppSpacing.lg),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.full),
        ),
      ),
    );
  }

  void _goNext() {
    if (!_photos.containsKey(_activeType)) {
      _showMessage('Primero captura la foto de ${_activeType.captureLabel}.');
      return;
    }

    if (_currentStep < _steps.length) {
      setState(() => _currentStep++);
    }
  }

  void _goBack() {
    if (_currentStep == 0) {
      Navigator.of(context).pop();
      return;
    }
    setState(() => _currentStep--);
  }

  Future<void> _submit() async {
    if (!_allPhotosCaptured || _isSubmitting) return;

    setState(() => _isSubmitting = true);

    try {
      final frontUrl = await DocumentService.uploadPhoto(
        userId: widget.userId,
        type: DocumentPhotoType.front,
        bytes: _photos[DocumentPhotoType.front]!,
        mimeType: _mimeTypes[DocumentPhotoType.front] ?? 'image/jpeg',
      );

      final backUrl = await DocumentService.uploadPhoto(
        userId: widget.userId,
        type: DocumentPhotoType.back,
        bytes: _photos[DocumentPhotoType.back]!,
        mimeType: _mimeTypes[DocumentPhotoType.back] ?? 'image/jpeg',
      );

      final selfieUrl = await DocumentService.uploadPhoto(
        userId: widget.userId,
        type: DocumentPhotoType.selfie,
        bytes: _photos[DocumentPhotoType.selfie]!,
        mimeType: _mimeTypes[DocumentPhotoType.selfie] ?? 'image/jpeg',
      );

      await DocumentService.saveUserDocuments(
        userId: widget.userId,
        documentFrontUrl: frontUrl,
        documentBackUrl: backUrl,
        selfieUrl: selfieUrl,
      );

      if (!mounted) return;

      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (context) => _SuccessDialog(
          motorcycleName: widget.motorcycleName,
        ),
      );

      if (mounted) Navigator.of(context).pop(true);
    } on DocumentUploadException catch (error) {
      if (mounted) _showMessage(error.message);
    } catch (_) {
      if (mounted) {
        _showMessage('No se pudieron guardar los documentos. Intenta de nuevo.');
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          onPressed: _isSubmitting ? null : _goBack,
          icon: const Icon(Icons.arrow_back_rounded),
        ),
        title: Text(
          'Verificación de identidad',
          style: AppTypography.headlineLgMobile.copyWith(fontSize: 18),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(28),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              0,
              AppSpacing.lg,
              AppSpacing.md,
            ),
            child: _ProgressBar(
              current: _isReviewStep ? _steps.length : _currentStep + 1,
              total: _steps.length + 1,
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  AppSpacing.sm,
                  AppSpacing.lg,
                  AppSpacing.lg,
                ),
                child: _isReviewStep
                    ? _ReviewSection(photos: _photos)
                    : _CaptureSection(
                        type: _activeType,
                        photo: _photos[_activeType],
                        onPickCamera: () => _pickPhoto(ImageSource.camera),
                        onPickGallery: () => _pickPhoto(ImageSource.gallery),
                        onRetake: () {
                          setState(() {
                            _photos.remove(_activeType);
                            _mimeTypes.remove(_activeType);
                          });
                        },
                      ),
              ),
            ),
            _BottomActions(
              isReview: _isReviewStep,
              isSubmitting: _isSubmitting,
              canContinue: _photos.containsKey(_activeType),
              onPrimary: _isReviewStep ? _submit : _goNext,
              primaryLabel: _isReviewStep ? 'Enviar documentos' : 'Continuar',
            ),
          ],
        ),
      ),
    );
  }
}

class _ProgressBar extends StatelessWidget {
  const _ProgressBar({required this.current, required this.total});

  final int current;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Paso $current de $total',
              style: AppTypography.labelSm.copyWith(color: AppColors.secondary),
            ),
            const Spacer(),
            Text(
              '${((current / total) * 100).round()}%',
              style: AppTypography.labelSm.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.full),
          child: LinearProgressIndicator(
            value: current / total,
            minHeight: 6,
            backgroundColor: AppColors.outlineVariant,
            color: AppColors.primary,
          ),
        ),
      ],
    );
  }
}

class _CaptureSection extends StatelessWidget {
  const _CaptureSection({
    required this.type,
    required this.photo,
    required this.onPickCamera,
    required this.onPickGallery,
    required this.onRetake,
  });

  final DocumentPhotoType type;
  final Uint8List? photo;
  final VoidCallback onPickCamera;
  final VoidCallback onPickGallery;
  final VoidCallback onRetake;

  @override
  Widget build(BuildContext context) {
    final isSelfie = type == DocumentPhotoType.selfie;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          decoration: BoxDecoration(
            color: AppColors.surfaceContainer,
            borderRadius: BorderRadius.circular(AppRadius.full),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                _iconForType(type),
                size: 16,
                color: AppColors.primary,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                type.captureLabel.toUpperCase(),
                style: AppTypography.labelSm.copyWith(
                  letterSpacing: 1.4,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(type.title, style: AppTypography.headlineLg),
        const SizedBox(height: AppSpacing.sm),
        Text(type.instruction, style: AppTypography.bodyMd),
        const SizedBox(height: AppSpacing.xl),
        AspectRatio(
          aspectRatio: isSelfie ? 0.82 : 1.55,
          child: _PhotoFrame(
            isSelfie: isSelfie,
            photo: photo,
            emptyLabel: isSelfie
                ? 'Centra tu rostro aquí'
                : 'Alinea tu documento aquí',
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        if (photo != null)
          OutlinedButton.icon(
            onPressed: onRetake,
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: const Text('Tomar otra foto'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.onSurface,
              side: const BorderSide(color: AppColors.outlineVariant),
              minimumSize: const Size.fromHeight(44),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.full),
              ),
            ),
          )
        else ...[
          FilledButton.icon(
            onPressed: onPickCamera,
            icon: const Icon(Icons.camera_alt_rounded, size: 20),
            label: Text(isSelfie ? 'Tomar selfie' : 'Tomar foto'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.full),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          OutlinedButton.icon(
            onPressed: onPickGallery,
            icon: const Icon(Icons.photo_library_outlined, size: 20),
            label: const Text('Elegir de galería'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.onSurface,
              side: const BorderSide(color: AppColors.outlineVariant),
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.full),
              ),
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.lg),
        _TipsCard(type: type),
      ],
    );
  }

  IconData _iconForType(DocumentPhotoType type) {
    switch (type) {
      case DocumentPhotoType.front:
        return Icons.badge_outlined;
      case DocumentPhotoType.back:
        return Icons.flip_to_back_outlined;
      case DocumentPhotoType.selfie:
        return Icons.face_retouching_natural_outlined;
    }
  }
}

class _PhotoFrame extends StatelessWidget {
  const _PhotoFrame({
    required this.isSelfie,
    required this.photo,
    required this.emptyLabel,
  });

  final bool isSelfie;
  final Uint8List? photo;
  final String emptyLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        border: Border.all(
          color: photo != null ? AppColors.primary : AppColors.outlineVariant,
          width: photo != null ? 2 : 1.5,
        ),
        boxShadow: AppShadows.subtle,
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (photo != null)
            Image.memory(photo!, fit: BoxFit.cover)
          else
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isSelfie
                        ? Icons.face_outlined
                        : Icons.credit_card_outlined,
                    size: 48,
                    color: AppColors.outline,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    emptyLabel,
                    style: AppTypography.bodySm.copyWith(
                      color: AppColors.secondary,
                    ),
                  ),
                ],
              ),
            ),
          if (photo == null)
            CustomPaint(
              painter: _FrameOverlayPainter(isSelfie: isSelfie),
            ),
          if (photo != null)
            Positioned(
              top: AppSpacing.md,
              right: AppSpacing.md,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.check_circle_rounded,
                      size: 14,
                      color: AppColors.onPrimary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Capturada',
                      style: AppTypography.labelSm.copyWith(
                        fontSize: 11,
                        color: AppColors.onPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _FrameOverlayPainter extends CustomPainter {
  _FrameOverlayPainter({required this.isSelfie});

  final bool isSelfie;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.primary.withValues(alpha: 0.35)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final corner = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    final rect = isSelfie
        ? Rect.fromCenter(
            center: Offset(size.width / 2, size.height / 2),
            width: size.width * 0.55,
            height: size.height * 0.7,
          )
        : Rect.fromLTWH(
            size.width * 0.08,
            size.height * 0.18,
            size.width * 0.84,
            size.height * 0.64,
          );

    if (isSelfie) {
      canvas.drawOval(rect, paint);
    } else {
      final rrect = RRect.fromRectAndRadius(
        rect,
        const Radius.circular(12),
      );
      canvas.drawRRect(rrect, paint);
    }

    const cornerLen = 22.0;
    final corners = [
      Offset(rect.left, rect.top),
      Offset(rect.right, rect.top),
      Offset(rect.left, rect.bottom),
      Offset(rect.right, rect.bottom),
    ];

    for (final origin in corners) {
      final isLeft = origin.dx == rect.left;
      final isTop = origin.dy == rect.top;
      canvas.drawLine(
        origin,
        origin + Offset(isLeft ? cornerLen : -cornerLen, 0),
        corner,
      );
      canvas.drawLine(
        origin,
        origin + Offset(0, isTop ? cornerLen : -cornerLen),
        corner,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _TipsCard extends StatelessWidget {
  const _TipsCard({required this.type});

  final DocumentPhotoType type;

  @override
  Widget build(BuildContext context) {
    final tips = switch (type) {
      DocumentPhotoType.front => [
        'Usa buena iluminación natural',
        'Evita reflejos sobre el plástico',
        'No recortes los bordes del documento',
      ],
      DocumentPhotoType.back => [
        'Captura el código de barras completo',
        'Mantén el documento plano',
        'Verifica que el texto sea legible',
      ],
      DocumentPhotoType.selfie => [
        'Quita lentes y gorras',
        'Mira directamente a la cámara',
        'Usa un fondo claro y uniforme',
      ],
    };

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('CONSEJOS', style: AppTypography.eyebrow),
          const SizedBox(height: AppSpacing.sm),
          for (final tip in tips) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.check_rounded,
                  size: 16,
                  color: AppColors.primary,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(child: Text(tip, style: AppTypography.bodySm)),
              ],
            ),
            if (tip != tips.last) const SizedBox(height: AppSpacing.xs),
          ],
        ],
      ),
    );
  }
}

class _ReviewSection extends StatelessWidget {
  const _ReviewSection({required this.photos});

  final Map<DocumentPhotoType, Uint8List> photos;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Revisa tus fotos', style: AppTypography.headlineLg),
        const SizedBox(height: AppSpacing.sm),
        Text(
          'Confirma que cada imagen corresponde al tipo correcto antes de enviar.',
          style: AppTypography.bodyMd,
        ),
        const SizedBox(height: AppSpacing.xl),
        for (final type in DocumentPhotoType.values) ...[
          _ReviewTile(
            type: type,
            photo: photos[type],
          ),
          if (type != DocumentPhotoType.selfie)
            const SizedBox(height: AppSpacing.md),
        ],
        const SizedBox(height: AppSpacing.lg),
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.surfaceContainer,
            borderRadius: BorderRadius.circular(AppRadius.xl),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.shield_outlined,
                color: AppColors.primary,
                size: 20,
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  'Tus documentos se almacenan de forma segura y solo se usan para validar tu identidad.',
                  style: AppTypography.bodySm,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ReviewTile extends StatelessWidget {
  const _ReviewTile({required this.type, required this.photo});

  final DocumentPhotoType type;
  final Uint8List? photo;

  @override
  Widget build(BuildContext context) {
    final isSelfie = type == DocumentPhotoType.selfie;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(color: AppColors.outlineVariant),
        boxShadow: AppShadows.subtle,
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            child: SizedBox(
              width: 72,
              height: isSelfie ? 88 : 48,
              child: photo != null
                  ? Image.memory(photo!, fit: BoxFit.cover)
                  : ColoredBox(
                      color: AppColors.surfaceContainer,
                      child: const Icon(Icons.image_not_supported_outlined),
                    ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(type.title, style: AppTypography.labelMd),
                const SizedBox(height: 2),
                Text(
                  type.captureLabel,
                  style: AppTypography.bodySm.copyWith(
                    color: AppColors.secondary,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(AppRadius.full),
            ),
            child: Text(
              _shortLabel(type),
              style: AppTypography.labelSm.copyWith(
                fontSize: 10,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _shortLabel(DocumentPhotoType type) {
    switch (type) {
      case DocumentPhotoType.front:
        return 'FRONTAL';
      case DocumentPhotoType.back:
        return 'TRASERO';
      case DocumentPhotoType.selfie:
        return 'SELFIE';
    }
  }
}

class _BottomActions extends StatelessWidget {
  const _BottomActions({
    required this.isReview,
    required this.isSubmitting,
    required this.canContinue,
    required this.onPrimary,
    required this.primaryLabel,
  });

  final bool isReview;
  final bool isSubmitting;
  final bool canContinue;
  final VoidCallback onPrimary;
  final String primaryLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: const BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        border: Border(top: BorderSide(color: AppColors.outlineVariant)),
      ),
      child: FilledButton(
        onPressed: (isReview || canContinue) && !isSubmitting ? onPrimary : null,
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.full),
          ),
        ),
        child: isSubmitting
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: AppColors.onPrimary,
                ),
              )
            : Text(primaryLabel),
      ),
    );
  }
}

class _SuccessDialog extends StatelessWidget {
  const _SuccessDialog({this.motorcycleName});

  final String? motorcycleName;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.xxl),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.verified_outlined,
                size: 32,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Documentos enviados',
              style: AppTypography.headlineMd,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              motorcycleName != null
                  ? 'Recibimos tu verificación para solicitar crédito de $motorcycleName. Te contactaremos pronto.'
                  : 'Recibimos tus documentos. Te contactaremos pronto para continuar con tu solicitud de crédito.',
              style: AppTypography.bodyMd,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(44),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
              ),
              child: const Text('Entendido'),
            ),
          ],
        ),
      ),
    );
  }
}
