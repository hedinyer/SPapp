import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:spapp/services/media_permission_service.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/widgets/frame_overlay_painter.dart';

enum LiveCameraState { loading, ready, error, permissionDenied }

class LiveCameraFrame extends StatefulWidget {
  const LiveCameraFrame({
    super.key,
    required this.isSelfie,
    required this.emptyLabel,
    this.onCapture,
  });

  final bool isSelfie;
  final String emptyLabel;
  final void Function(Uint8List bytes)? onCapture;

  @override
  State<LiveCameraFrame> createState() => LiveCameraFrameState();
}

class LiveCameraFrameState extends State<LiveCameraFrame>
    with WidgetsBindingObserver {
  CameraController? _controller;
  LiveCameraState _state = LiveCameraState.loading;
  String? _errorMessage;
  bool _isCapturing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initCamera();
  }

  @override
  void didUpdateWidget(covariant LiveCameraFrame oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.isSelfie != widget.isSelfie) {
      _disposeController();
      _initCamera();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;

    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      _disposeController();
    } else if (state == AppLifecycleState.resumed) {
      _initCamera();
    }
  }

  Future<void> _initCamera() async {
    if (!mounted) return;

    setState(() {
      _state = LiveCameraState.loading;
      _errorMessage = null;
    });

    final granted = await MediaPermissionService.ensureAccess(
      MediaAccessType.camera,
      context: context,
    );

    if (!granted) {
      if (!mounted) return;
      setState(() {
        _state = LiveCameraState.permissionDenied;
        _errorMessage = 'Se necesita acceso a la cámara para continuar.';
      });
      return;
    }

    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        if (!mounted) return;
        setState(() {
          _state = LiveCameraState.error;
          _errorMessage = 'No se encontró ninguna cámara en este dispositivo.';
        });
        return;
      }

      final lens = widget.isSelfie
          ? CameraLensDirection.front
          : CameraLensDirection.back;

      final camera = cameras.firstWhere(
        (c) => c.lensDirection == lens,
        orElse: () => cameras.first,
      );

      final controller = CameraController(
        camera,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await controller.initialize();
      await controller.lockCaptureOrientation(DeviceOrientation.portraitUp);

      if (!mounted) {
        await controller.dispose();
        return;
      }

      setState(() {
        _controller = controller;
        _state = LiveCameraState.ready;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _state = LiveCameraState.error;
        _errorMessage =
            'No se pudo iniciar la cámara. Intenta de nuevo o elige una foto de galería.';
      });
    }
  }

  Future<void> capture() async {
    final controller = _controller;
    if (controller == null ||
        !controller.value.isInitialized ||
        _isCapturing ||
        _state != LiveCameraState.ready) {
      return;
    }

    setState(() => _isCapturing = true);

    try {
      final file = await controller.takePicture();
      final bytes = await file.readAsBytes();
      widget.onCapture?.call(bytes);
    } catch (_) {
      if (mounted) {
        setState(() {
          _state = LiveCameraState.error;
          _errorMessage = 'No se pudo capturar la foto. Intenta de nuevo.';
        });
      }
    } finally {
      if (mounted) setState(() => _isCapturing = false);
    }
  }

  void _disposeController() {
    final controller = _controller;
    _controller = null;
    controller?.dispose();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _disposeController();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        switch (_state) {
          LiveCameraState.ready => _buildPreview(),
          LiveCameraState.loading => _buildPlaceholder(
              icon: Icons.camera_alt_outlined,
              message: 'Iniciando cámara...',
              showSpinner: true,
            ),
          LiveCameraState.permissionDenied ||
          LiveCameraState.error =>
            _buildPlaceholder(
              icon: Icons.videocam_off_outlined,
              message: _errorMessage ?? widget.emptyLabel,
              showRetry: true,
            ),
        },
        if (_state == LiveCameraState.ready)
          CustomPaint(
            painter: FrameOverlayPainter(isSelfie: widget.isSelfie),
          ),
        if (_isCapturing)
          ColoredBox(
            color: Colors.black.withValues(alpha: 0.25),
            child: const Center(
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: AppColors.onPrimary,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildPreview() {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return _buildPlaceholder(
        icon: Icons.camera_alt_outlined,
        message: 'Iniciando cámara...',
        showSpinner: true,
      );
    }

    return ClipRect(
      child: FittedBox(
        fit: BoxFit.cover,
        child: SizedBox(
          width: controller.value.previewSize?.height ?? 1,
          height: controller.value.previewSize?.width ?? 1,
          child: CameraPreview(controller),
        ),
      ),
    );
  }

  Widget _buildPlaceholder({
    required IconData icon,
    required String message,
    bool showSpinner = false,
    bool showRetry = false,
  }) {
    return ColoredBox(
      color: AppColors.surfaceContainerLow,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (showSpinner)
                const Padding(
                  padding: EdgeInsets.only(bottom: AppSpacing.md),
                  child: SizedBox(
                    width: 28,
                    height: 28,
                    child: CircularProgressIndicator(strokeWidth: 2.5),
                  ),
                )
              else
                Icon(icon, size: 48, color: AppColors.outline),
              const SizedBox(height: AppSpacing.sm),
              Text(
                message,
                style: AppTypography.bodySm.copyWith(color: AppColors.secondary),
                textAlign: TextAlign.center,
              ),
              if (showRetry) ...[
                const SizedBox(height: AppSpacing.md),
                OutlinedButton.icon(
                  onPressed: _initCamera,
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: const Text('Reintentar'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.onSurface,
                    side: const BorderSide(color: AppColors.outlineVariant),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
