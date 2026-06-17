import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:spapp/models/user_document.dart';
import 'package:spapp/services/document_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ApplicationStatusWatcher {
  ApplicationStatusWatcher({
    required this.userId,
    required this.onChanged,
    this.pollInterval = const Duration(seconds: 30),
  });

  final int userId;
  final ValueChanged<UserDocument?> onChanged;
  final Duration pollInterval;

  RealtimeChannel? _channel;
  Timer? _pollTimer;
  UserDocument? _lastDocument;
  bool _isDisposed = false;
  bool _initialDelivered = false;

  void start() {
    unawaited(_loadCachedThenFetch());
    _channel = DocumentService.subscribeToUserDocuments(
      userId: userId,
      onChanged: _onRealtimePayload,
    );
  }

  void dispose() {
    _isDisposed = true;
    _pollTimer?.cancel();
    _pollTimer = null;
    DocumentService.unsubscribe(_channel);
    _channel = null;
  }

  Future<void> refresh() => _fetchStatus(forceRefresh: true);

  Future<void> _loadCachedThenFetch() async {
    final cached = await DocumentService.getLatestUserDocumentCached(userId);
    if (_isDisposed) return;

    if (cached != null) {
      _initialDelivered = true;
      _lastDocument = cached;
      onChanged(cached);
      _syncPolling(cached);
    }

    await _fetchStatus();
  }

  void _onRealtimePayload(PostgresChangePayload payload) {
    final record = payload.newRecord;
    if (record.isNotEmpty) {
      try {
        final document = UserDocument.fromJson(
          Map<String, dynamic>.from(record),
        );
        if (document.userId == userId) {
          _deliverDocument(document);
        }
      } catch (error) {
        if (kDebugMode) {
          debugPrint('users_documents realtime parse failed: $error');
        }
      }
    }

    unawaited(_fetchStatus(forceRefresh: true));
  }

  Future<void> _fetchStatus({bool forceRefresh = false}) async {
    if (_isDisposed) return;

    final document = await DocumentService.getLatestUserDocumentCached(
      userId,
      forceRefresh: forceRefresh,
    );
    if (_isDisposed) return;

    _deliverDocument(document);
  }

  void _deliverDocument(UserDocument? document) {
    final changed = _hasChanged(_lastDocument, document);
    if (!_initialDelivered || changed) {
      _initialDelivered = true;
      _lastDocument = document;
      onChanged(document);
    }

    _syncPolling(document);
  }

  void _syncPolling(UserDocument? document) {
    _pollTimer?.cancel();
    _pollTimer = null;

    if (_isDisposed) return;
    if (document?.estadoSolicitud != SolicitudEstado.pendiente) return;

    _pollTimer = Timer.periodic(pollInterval, (_) {
      _fetchStatus(forceRefresh: true);
    });
  }

  bool _hasChanged(UserDocument? previous, UserDocument? next) {
    if (previous == null && next == null) return false;
    if (previous == null || next == null) return true;

    return previous.id != next.id ||
        previous.estadoSolicitud != next.estadoSolicitud ||
        previous.betado != next.betado ||
        previous.motivoRechazo != next.motivoRechazo ||
        previous.horaActualizacion != next.horaActualizacion;
  }
}
