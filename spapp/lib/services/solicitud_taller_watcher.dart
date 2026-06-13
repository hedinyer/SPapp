import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:spapp/models/solicitud_taller.dart';
import 'package:spapp/services/solicitud_taller_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SolicitudTallerWatcher {
  SolicitudTallerWatcher({
    required this.userId,
    required this.onChanged,
    this.pollInterval = const Duration(seconds: 30),
  });

  final int userId;
  final ValueChanged<List<SolicitudTaller>> onChanged;
  final Duration pollInterval;

  RealtimeChannel? _channel;
  Timer? _pollTimer;
  List<SolicitudTaller> _lastSolicitudes = [];
  bool _isDisposed = false;
  bool _initialDelivered = false;

  void start() {
    unawaited(_loadCachedThenFetch());
    _channel = SolicitudTallerService.subscribeToSolicitudes(
      userId: userId,
      onChanged: _fetchSolicitudes,
    );
  }

  void dispose() {
    _isDisposed = true;
    _pollTimer?.cancel();
    _pollTimer = null;
    SolicitudTallerService.unsubscribe(_channel);
    _channel = null;
  }

  Future<void> refresh() => _fetchSolicitudes(forceRefresh: true);

  Future<void> _loadCachedThenFetch() async {
    final cached =
        await SolicitudTallerService.getLatestSolicitudesCached(userId);
    if (_isDisposed) return;

    if (cached.isNotEmpty) {
      _initialDelivered = true;
      _lastSolicitudes = cached;
      onChanged(cached);
      _syncPolling(cached);
    }

    await _fetchSolicitudes();
  }

  Future<void> _fetchSolicitudes({bool forceRefresh = false}) async {
    if (_isDisposed) return;

    final solicitudes =
        await SolicitudTallerService.getLatestSolicitudesCached(
      userId,
      forceRefresh: forceRefresh,
    );
    if (_isDisposed) return;

    final changed = _hasChanged(_lastSolicitudes, solicitudes);
    if (!_initialDelivered || changed) {
      _initialDelivered = true;
      _lastSolicitudes = solicitudes;
      onChanged(solicitudes);
    }

    _syncPolling(solicitudes);
  }

  void _syncPolling(List<SolicitudTaller> solicitudes) {
    _pollTimer?.cancel();
    _pollTimer = null;

    if (_isDisposed) return;

    final hasActive = solicitudes.any((s) => s.isActive);
    if (!hasActive && solicitudes.isNotEmpty) return;

    _pollTimer = Timer.periodic(pollInterval, (_) {
      _fetchSolicitudes();
    });
  }

  bool _hasChanged(
    List<SolicitudTaller> previous,
    List<SolicitudTaller> next,
  ) {
    if (previous.length != next.length) return true;

    for (var i = 0; i < previous.length; i++) {
      final a = previous[i];
      final b = next[i];

      if (a.id != b.id ||
          a.estado != b.estado ||
          a.updatedAt != b.updatedAt ||
          a.notasAdmin != b.notasAdmin ||
          a.totalEstimado != b.totalEstimado) {
        return true;
      }
    }

    return false;
  }
}
