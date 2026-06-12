import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:spapp/models/visita.dart';
import 'package:spapp/services/visit_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class VisitAssignmentWatcher {
  VisitAssignmentWatcher({
    required this.userId,
    required this.onChanged,
    this.pollInterval = const Duration(seconds: 10),
  });

  final int userId;
  final ValueChanged<Visita?> onChanged;
  final Duration pollInterval;

  RealtimeChannel? _channel;
  Timer? _pollTimer;
  Visita? _lastVisit;
  bool _isDisposed = false;
  bool _initialDelivered = false;

  void start() {
    _fetchVisit();
    _channel = VisitService.subscribeToVisits(
      userId: userId,
      onChanged: _fetchVisit,
    );
  }

  void dispose() {
    _isDisposed = true;
    _pollTimer?.cancel();
    _pollTimer = null;
    VisitService.unsubscribe(_channel);
    _channel = null;
  }

  Future<void> refresh() => _fetchVisit();

  Future<void> _fetchVisit() async {
    if (_isDisposed) return;

    final visit = await VisitService.getLatestVisit(userId);
    if (_isDisposed) return;

    final changed = _hasChanged(_lastVisit, visit);
    if (!_initialDelivered || changed) {
      _initialDelivered = true;
      _lastVisit = visit;
      onChanged(visit);
    }

    _syncPolling(visit);
  }

  void _syncPolling(Visita? visit) {
    _pollTimer?.cancel();
    _pollTimer = null;

    if (_isDisposed) return;
    if (visit != null && !visit.isActive) return;

    _pollTimer = Timer.periodic(pollInterval, (_) {
      _fetchVisit();
    });
  }

  bool _hasChanged(Visita? previous, Visita? next) {
    if (previous == null && next == null) return false;
    if (previous == null || next == null) return true;

    return previous.id != next.id ||
        previous.estado != next.estado ||
        previous.visitadorId != next.visitadorId ||
        previous.fechaProgramada != next.fechaProgramada ||
        previous.updatedAt != next.updatedAt ||
        previous.visitador?.nombre != next.visitador?.nombre ||
        previous.visitador?.fotoUrl != next.visitador?.fotoUrl;
  }
}
