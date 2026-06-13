import 'dart:async';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:spapp/services/offline_queue_service.dart';

/// Monitorea conectividad y dispara la cola offline al recuperar red.
class ConnectivityService {
  ConnectivityService._();

  static final ConnectivityService instance = ConnectivityService._();

  final ValueNotifier<bool> isOnline = ValueNotifier(true);
  final ValueNotifier<bool> isSlowConnection = ValueNotifier(false);

  StreamSubscription<List<ConnectivityResult>>? _subscription;
  Timer? _slowProbeTimer;
  bool _started = false;

  Future<void> start() async {
    if (_started) return;
    _started = true;

    final initial = await Connectivity().checkConnectivity();
    _updateOnline(initial);

    _subscription = Connectivity().onConnectivityChanged.listen(_updateOnline);
    _slowProbeTimer = Timer.periodic(
      const Duration(seconds: 45),
      (_) => _probeLatency(),
    );
  }

  Future<void> dispose() async {
    await _subscription?.cancel();
    _slowProbeTimer?.cancel();
    _started = false;
  }

  void _updateOnline(List<ConnectivityResult> results) {
    final online = results.any((r) => r != ConnectivityResult.none);
    if (isOnline.value == online) return;

    isOnline.value = online;
    if (online) {
      unawaited(OfflineQueueService.processQueue());
    }
  }

  Future<void> _probeLatency() async {
    if (!isOnline.value) return;

    final stopwatch = Stopwatch()..start();
    try {
      final client = HttpClient()
        ..connectionTimeout = const Duration(seconds: 8);
      final request =
          await client.getUrl(Uri.parse('https://www.google.com/generate_204'));
      await request.close();
      client.close(force: true);
      stopwatch.stop();
      isSlowConnection.value = stopwatch.elapsedMilliseconds > 4000;
    } catch (_) {
      isSlowConnection.value = true;
    }
  }
}
