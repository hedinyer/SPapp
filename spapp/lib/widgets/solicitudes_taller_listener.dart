import 'package:flutter/material.dart';
import 'package:spapp/models/solicitud_taller.dart';
import 'package:spapp/services/solicitud_taller_watcher.dart';

typedef SolicitudesTallerBuilder = Widget Function(
  BuildContext context,
  List<SolicitudTaller> solicitudes,
  bool isLoading,
  Future<void> Function() refresh,
);

class SolicitudesTallerListener extends StatefulWidget {
  const SolicitudesTallerListener({
    super.key,
    required this.userId,
    required this.builder,
  });

  final int userId;
  final SolicitudesTallerBuilder builder;

  @override
  State<SolicitudesTallerListener> createState() =>
      _SolicitudesTallerListenerState();
}

class _SolicitudesTallerListenerState extends State<SolicitudesTallerListener> {
  List<SolicitudTaller> _solicitudes = [];
  bool _isLoading = true;
  SolicitudTallerWatcher? _watcher;

  @override
  void initState() {
    super.initState();
    _watcher = SolicitudTallerWatcher(
      userId: widget.userId,
      onChanged: _onSolicitudesChanged,
    )..start();
  }

  @override
  void dispose() {
    _watcher?.dispose();
    super.dispose();
  }

  void _onSolicitudesChanged(List<SolicitudTaller> solicitudes) {
    if (!mounted) return;
    setState(() {
      _solicitudes = solicitudes;
      _isLoading = false;
    });
  }

  Future<void> _refresh() => _watcher?.refresh() ?? Future.value();

  @override
  Widget build(BuildContext context) {
    return widget.builder(
      context,
      _solicitudes,
      _isLoading,
      _refresh,
    );
  }
}

