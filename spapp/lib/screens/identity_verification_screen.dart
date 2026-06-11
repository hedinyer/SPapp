import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:spapp/models/document_photo_type.dart';
import 'package:spapp/services/document_service.dart';
import 'package:spapp/services/media_permission_service.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/widgets/live_camera_frame.dart';

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
  final _cameraKey = GlobalKey<LiveCameraFrameState>();
  final _photos = <DocumentPhotoType, Uint8List>{};
  final _mimeTypes = <DocumentPhotoType, String>{};

  int _currentStep = 0;
  bool _isSubmitting = false;

  DocumentPhotoType? get _activeType =>
      _currentStep < _steps.length ? _steps[_currentStep] : null;

  bool get _allPhotosCaptured =>
      _photos.containsKey(DocumentPhotoType.front) &&
      _photos.containsKey(DocumentPhotoType.back) &&
      _photos.containsKey(DocumentPhotoType.selfie);

  bool get _isReviewStep => _currentStep >= _steps.length;

  void _onPhotoCaptured(Uint8List bytes) {
    final type = _activeType;
    if (type == null) return;

    setState(() {
      _photos[type] = bytes;
      _mimeTypes[type] = 'image/jpeg';
    });
  }

  Future<void> _captureFromCamera() async {
    await _cameraKey.currentState?.capture();
  }

  Future<void> _pickFromGallery() async {
    final granted = await MediaPermissionService.ensureAccess(
      MediaAccessType.gallery,
      context: context,
    );
    if (!granted || !mounted) return;

    final type = _activeType;
    if (type == null) return;

    final isSelfie = type == DocumentPhotoType.selfie;

    try {
      final file = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
        maxWidth: isSelfie ? 1200 : 2000,
      );

      if (file == null || !mounted) return;

      final bytes = await file.readAsBytes();
      final mime = _mimeFromPath(file.path);

      setState(() {
        _photos[type] = bytes;
        _mimeTypes[type] = mime;
      });
    } catch (error) {
      if (!mounted) return;
      if (kDebugMode) debugPrint('Gallery pick error: $error');
      _showMessage(
        'No se pudo abrir la galería. Revisa los permisos e intenta de nuevo.',
      );
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
    final type = _activeType;
    if (type == null) return;

    if (!_photos.containsKey(type)) {
      _showMessage('Primero captura la foto de ${type.captureLabel}.');
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

    if (widget.userId <= 0) {
      _showMessage(
        'No se pudo identificar tu usuario. Cierra sesión e inicia de nuevo.',
      );
      return;
    }

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
    } catch (error, stackTrace) {
      if (kDebugMode) {
        debugPrint('Document submit error: $error');
        debugPrint('$stackTrace');
      }
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
          style: AppTypography.headlineSm,
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
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  AppSpacing.sm,
                  AppSpacing.lg,
                  AppSpacing.lg,
                ),
                child: _isReviewStep
                    ? SingleChildScrollView(
                        child: _ReviewSection(photos: _photos),
                      )
                    : _CaptureSection(
                        type: _activeType!,
                        photo: _photos[_activeType],
                        cameraKey: _cameraKey,
                        fitToScreen:
                            _activeType == DocumentPhotoType.selfie,
                        onCapture: _captureFromCamera,
                        onPickGallery: _pickFromGallery,
                        onPhotoCaptured: _onPhotoCaptured,
                        onRetake: () {
                          final type = _activeType;
                          if (type == null) return;
                          setState(() {
                            _photos.remove(type);
                            _mimeTypes.remove(type);
                          });
                        },
                      ),
              ),
            ),
            _BottomActions(
              isReview: _isReviewStep,
              isSubmitting: _isSubmitting,
              canContinue: _isReviewStep
                  ? _allPhotosCaptured
                  : _photos.containsKey(_activeType),
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
    required this.cameraKey,
    required this.fitToScreen,
    required this.onCapture,
    required this.onPickGallery,
    required this.onPhotoCaptured,
    required this.onRetake,
  });

  final DocumentPhotoType type;
  final Uint8List? photo;
  final GlobalKey<LiveCameraFrameState> cameraKey;
  final bool fitToScreen;
  final Future<void> Function() onCapture;
  final VoidCallback onPickGallery;
  final void Function(Uint8List bytes) onPhotoCaptured;
  final VoidCallback onRetake;

  @override
  Widget build(BuildContext context) {
    final isSelfie = type == DocumentPhotoType.selfie;

    final photoFrame = _PhotoFrame(
      isSelfie: isSelfie,
      photo: photo,
      cameraKey: cameraKey,
      onPhotoCaptured: onPhotoCaptured,
      emptyLabel: isSelfie
          ? 'Centra tu rostro aquí'
          : 'Alinea tu documento aquí',
    );

    final actionButtons = _buildActionButtons(isSelfie);

    if (fitToScreen) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.xs,
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
                      size: 14,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      type.captureLabel.toUpperCase(),
                      style: AppTypography.labelSm.copyWith(
                        fontSize: 10,
                        letterSpacing: 1.2,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  type.title,
                  style: AppTypography.headlineSm.copyWith(fontSize: 15),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            type.instruction,
            style: AppTypography.bodySm,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: AppSpacing.sm),
          Expanded(child: photoFrame),
          const SizedBox(height: AppSpacing.sm),
          actionButtons,
        ],
      );
    }

    return SingleChildScrollView(
      child: Column(
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
          Text(type.title, style: AppTypography.headlineSm),
          const SizedBox(height: AppSpacing.sm),
          Text(type.instruction, style: AppTypography.bodyMd),
          const SizedBox(height: AppSpacing.xl),
          AspectRatio(
            aspectRatio: isSelfie ? 0.82 : 1.55,
            child: photoFrame,
          ),
          const SizedBox(height: AppSpacing.lg),
          actionButtons,
        ],
      ),
    );
  }

  Widget _buildActionButtons(bool isSelfie) {
    final buttonHeight = fitToScreen ? 44.0 : 52.0;

    if (photo != null) {
      return OutlinedButton.icon(
        onPressed: onRetake,
        icon: const Icon(Icons.refresh_rounded, size: 18),
        label: const Text('Tomar otra foto'),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.onSurface,
          side: const BorderSide(color: AppColors.outlineVariant),
          minimumSize: Size.fromHeight(buttonHeight),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.full),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilledButton.icon(
          onPressed: onCapture,
          icon: const Icon(Icons.camera_alt_rounded, size: 20),
          label: Text(isSelfie ? 'Capturar selfie' : 'Capturar'),
          style: FilledButton.styleFrom(
            minimumSize: Size.fromHeight(buttonHeight),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.full),
            ),
          ),
        ),
        SizedBox(
          height: fitToScreen ? AppSpacing.xs : AppSpacing.sm,
        ),
        OutlinedButton.icon(
          onPressed: onPickGallery,
          icon: const Icon(Icons.photo_library_outlined, size: 20),
          label: const Text('Elegir de galería'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.onSurface,
            side: const BorderSide(color: AppColors.outlineVariant),
            minimumSize: Size.fromHeight(buttonHeight),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.full),
            ),
          ),
        ),
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
    required this.cameraKey,
    required this.onPhotoCaptured,
    required this.emptyLabel,
  });

  final bool isSelfie;
  final Uint8List? photo;
  final GlobalKey<LiveCameraFrameState> cameraKey;
  final void Function(Uint8List bytes) onPhotoCaptured;
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
            LiveCameraFrame(
              key: cameraKey,
              isSelfie: isSelfie,
              emptyLabel: emptyLabel,
              onCapture: onPhotoCaptured,
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

class _ReviewSection extends StatelessWidget {
  const _ReviewSection({required this.photos});

  final Map<DocumentPhotoType, Uint8List> photos;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Revisa tus fotos', style: AppTypography.headlineSm),
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
