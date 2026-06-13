import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:spapp/models/visita.dart';
import 'package:spapp/services/media_permission_service.dart';
import 'package:spapp/services/visitador_visit_service.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/widgets/live_camera_frame.dart';
import 'package:url_launcher/url_launcher.dart';

class VisitaEjecucionScreen extends StatefulWidget {
  const VisitaEjecucionScreen({
    super.key,
    required this.visita,
    required this.visitadorId,
  });

  final Visita visita;
  final int visitadorId;

  @override
  State<VisitaEjecucionScreen> createState() => _VisitaEjecucionScreenState();
}

class _VisitaEjecucionScreenState extends State<VisitaEjecucionScreen> {
  final _picker = ImagePicker();
  final _cameraKey = GlobalKey<LiveCameraFrameState>();
  final _notasController = TextEditingController();

  final List<VisitaEvidenciaFoto> _fotos = [];
  final List<VisitaEvidenciaVideo> _videos = [];
  VisitaUbicacionVerificada? _ubicacion;

  bool _capturingPhoto = false;
  bool _uploadingVideo = false;
  bool _capturingLocation = false;
  bool _submitting = false;
  String? _error;

  bool get _canComplete =>
      _fotos.isNotEmpty && _videos.isNotEmpty && _ubicacion != null;

  @override
  void dispose() {
    _notasController.dispose();
    super.dispose();
  }

  Future<void> _capturePhoto() async {
    setState(() {
      _capturingPhoto = true;
      _error = null;
    });

    try {
      await _cameraKey.currentState?.capture();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
      setState(() => _capturingPhoto = false);
    }
  }

  Future<void> _onPhotoCaptured(Uint8List bytes) async {
    try {
      if (bytes.isEmpty) {
        throw const VisitadorVisitException('No se pudo capturar la foto.');
      }

      final url = await VisitadorVisitService.uploadPhoto(
        visitadorId: widget.visitadorId,
        visitaId: widget.visita.id,
        bytes: bytes,
        mimeType: 'image/jpeg',
      );

      if (!mounted) return;
      setState(() {
        _fotos.add(VisitaEvidenciaFoto(
          url: url,
          capturedAt: DateTime.now(),
        ));
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _capturingPhoto = false);
    }
  }

  Future<void> _pickPhotoFromGallery() async {
    final granted = await MediaPermissionService.ensureAccess(
      MediaAccessType.gallery,
      context: context,
    );
    if (!granted || !mounted) return;

    setState(() {
      _capturingPhoto = true;
      _error = null;
    });

    try {
      final file = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );
      if (file == null) return;

      final bytes = await file.readAsBytes();
      final url = await VisitadorVisitService.uploadPhoto(
        visitadorId: widget.visitadorId,
        visitaId: widget.visita.id,
        bytes: bytes,
        mimeType: 'image/jpeg',
      );

      if (!mounted) return;
      setState(() {
        _fotos.add(VisitaEvidenciaFoto(
          url: url,
          capturedAt: DateTime.now(),
        ));
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _capturingPhoto = false);
    }
  }

  Future<void> _pickVideo() async {
    final granted = await MediaPermissionService.ensureAccess(
      MediaAccessType.gallery,
      context: context,
    );
    if (!granted || !mounted) return;

    setState(() {
      _uploadingVideo = true;
      _error = null;
    });

    try {
      final file = await _picker.pickVideo(
        source: ImageSource.camera,
        maxDuration: const Duration(minutes: 3),
      );
      if (file == null) return;

      final bytes = await file.readAsBytes();
      final mime = _mimeForPath(file.path);

      final url = await VisitadorVisitService.uploadVideo(
        visitadorId: widget.visitadorId,
        visitaId: widget.visita.id,
        bytes: bytes,
        mimeType: mime,
      );

      if (!mounted) return;
      setState(() {
        _videos.add(VisitaEvidenciaVideo(
          url: url,
          capturedAt: DateTime.now(),
        ));
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _uploadingVideo = false);
    }
  }

  Future<void> _captureLocation() async {
    final granted = await MediaPermissionService.ensureAccess(
      MediaAccessType.location,
      context: context,
    );
    if (!granted || !mounted) return;

    setState(() {
      _capturingLocation = true;
      _error = null;
    });

    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        throw const VisitadorVisitException(
          'Activa el GPS del dispositivo para capturar la ubicación.',
        );
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 20),
        ),
      );

      if (!mounted) return;
      setState(() {
        _ubicacion = VisitaUbicacionVerificada(
          lat: position.latitude,
          lng: position.longitude,
          accuracy: position.accuracy,
          capturedAt: DateTime.now(),
        );
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _capturingLocation = false);
    }
  }

  Future<void> _openMaps() async {
    final direccion = widget.visita.direccionCompleta;
    final uri = direccion.isNotEmpty
        ? Uri.parse(
            'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(direccion)}',
          )
        : (_ubicacion != null
            ? Uri.parse(
                'https://www.google.com/maps?q=${_ubicacion!.lat},${_ubicacion!.lng}',
              )
            : null);

    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _completeVisit() async {
    final ubicacion = _ubicacion;
    if (!_canComplete || ubicacion == null) return;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await VisitadorVisitService.completeVisit(
        visitadorId: widget.visitadorId,
        visitaId: widget.visita.id,
        fotos: _fotos,
        videos: _videos,
        ubicacion: ubicacion,
        notas: _notasController.text,
      );

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  String _mimeForPath(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.mov')) return 'video/quicktime';
    if (lower.endsWith('.webm')) return 'video/webm';
    return 'video/mp4';
  }

  @override
  Widget build(BuildContext context) {
    final visita = widget.visita;

    return Scaffold(
      backgroundColor: AppColors.surfaceContainerLowest,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceContainerLowest,
        elevation: 0,
        title: Text(visita.clienteNombre ?? 'Visita'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          _sectionCard(
            title: 'Datos del cliente',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _infoRow('Celular', visita.clienteCelular ?? '—'),
                _infoRow('Dirección', visita.direccionCompleta.isNotEmpty
                    ? visita.direccionCompleta
                    : '—'),
                const SizedBox(height: AppSpacing.sm),
                OutlinedButton.icon(
                  onPressed: _openMaps,
                  icon: const Icon(Icons.map_outlined),
                  label: const Text('Abrir en mapas'),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _sectionCard(
            title: 'Fotos de evidencia (${_fotos.length})',
            child: Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(AppRadius.xl),
                  child: SizedBox(
                    height: 220,
                    width: double.infinity,
                    child: LiveCameraFrame(
                      key: _cameraKey,
                      isSelfie: false,
                      emptyLabel: 'Cámara no disponible',
                      onCapture: _onPhotoCaptured,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton(
                        onPressed: _capturingPhoto ? null : _capturePhoto,
                        child: Text(
                          _capturingPhoto ? 'Subiendo…' : 'Tomar foto',
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: OutlinedButton(
                        onPressed:
                            _capturingPhoto ? null : _pickPhotoFromGallery,
                        child: const Text('Galería'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _sectionCard(
            title: 'Video de evidencia (${_videos.length})',
            child: FilledButton.icon(
              onPressed: _uploadingVideo ? null : _pickVideo,
              icon: const Icon(Icons.videocam_outlined),
              label: Text(_uploadingVideo ? 'Subiendo…' : 'Grabar o elegir video'),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _sectionCard(
            title: 'Ubicación exacta',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_ubicacion != null)
                  Text(
                    '${_ubicacion!.lat.toStringAsFixed(6)}, '
                    '${_ubicacion!.lng.toStringAsFixed(6)}'
                    '${_ubicacion!.accuracy != null ? ' · ±${_ubicacion!.accuracy!.round()} m' : ''}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  )
                else
                  const Text('Aún no se ha capturado la ubicación.'),
                const SizedBox(height: AppSpacing.sm),
                FilledButton.icon(
                  onPressed: _capturingLocation ? null : _captureLocation,
                  icon: const Icon(Icons.my_location),
                  label: Text(
                    _capturingLocation ? 'Obteniendo…' : 'Capturar ubicación',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _notasController,
            decoration: const InputDecoration(
              labelText: 'Notas (opcional)',
              border: OutlineInputBorder(),
            ),
            maxLines: 3,
          ),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.md),
            Text(
              _error!,
              style: const TextStyle(color: AppColors.error),
            ),
          ],
          const SizedBox(height: AppSpacing.lg),
          FilledButton(
            onPressed: _submitting || !_canComplete ? null : _completeVisit,
            child: Text(_submitting ? 'Completando…' : 'Completar visita'),
          ),
        ],
      ),
    );
  }

  Widget _sectionCard({required String title, required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.md),
          child,
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: RichText(
        text: TextSpan(
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurface,
              ),
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(color: AppColors.onSurfaceVariant),
            ),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }
}
