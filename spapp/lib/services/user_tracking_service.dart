import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spapp/models/user_tracking.dart';
import 'package:spapp/services/media_permission_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:workmanager/workmanager.dart';

class UserTrackingService {
  static const nightlyTaskName = 'nightly_location_capture';
  static const prefsUserIdKey = 'tracking_user_id';
  static const _prefsLastNightlyPrefix = 'tracking_last_nightly_';
  static const _realtimeInterval = Duration(seconds: 30);

  static SupabaseClient get _client => Supabase.instance.client;

  static int? _activeUserId;
  static RealtimeChannel? _realtimeChannel;
  static StreamSubscription<Position>? _positionSubscription;
  static Timer? _realtimeThrottle;
  static bool _seguimientoActive = false;
  static DateTime? _lastRealtimePush;

  static Future<void> ensureRow({required int userId}) async {
    try {
      await _client.from('users_tracking').upsert(
        {
          'user_id': userId,
          'seguimiento': false,
        },
        onConflict: 'user_id',
        ignoreDuplicates: true,
      );
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('users_tracking ensureRow failed: ${error.message}');
      }
    }
  }

  static Future<UserTracking?> getByUserId(int userId) async {
    try {
      final response = await _client
          .from('users_tracking')
          .select()
          .eq('user_id', userId)
          .maybeSingle();

      if (response == null) return null;
      return UserTracking.fromJson(response);
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('users_tracking select failed: ${error.message}');
      }
      return null;
    }
  }

  static Future<void> start(int userId) async {
    if (_activeUserId == userId && _realtimeChannel != null) return;

    await stop();

    final tracking = await getByUserId(userId);
    if (tracking == null) return;

    _activeUserId = userId;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(prefsUserIdKey, userId);

    await MediaPermissionService.requestTrackingPermissions();
    await _registerNightlyTask(userId);
    await _catchUpMissedNightly(userId);

    _seguimientoActive = tracking.seguimiento;
    if (_seguimientoActive) {
      await _startRealtimeStream(userId);
    }

    _realtimeChannel = _client
        .channel('users_tracking_$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'users_tracking',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: userId.toString(),
          ),
          callback: (payload) {
            final seguimiento = payload.newRecord['seguimiento'] as bool?;
            if (seguimiento == null) return;
            _handleSeguimientoChange(userId, seguimiento);
          },
        )
        .subscribe();
  }

  static Future<void> stop() async {
    _realtimeThrottle?.cancel();
    _realtimeThrottle = null;
    await _positionSubscription?.cancel();
    _positionSubscription = null;
    _seguimientoActive = false;
    _lastRealtimePush = null;

    if (_realtimeChannel != null) {
      await _client.removeChannel(_realtimeChannel!);
      _realtimeChannel = null;
    }

    _activeUserId = null;
  }

  static Future<void> updateUbicacion1({
    required int userId,
    required TrackingLocation location,
  }) async {
    try {
      await _client.from('users_tracking').update({
        'ubicacion_1': location.toJson(),
      }).eq('user_id', userId);
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('users_tracking ubicacion_1 update failed: ${error.message}');
      }
    }
  }

  static Future<void> rotateNightlyLocation({
    required int userId,
    required TrackingLocation location,
  }) async {
    try {
      await _client.rpc(
        'rotate_nightly_location',
        params: {
          'p_user_id': userId,
          'p_location': location.toJson(),
        },
      );
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint(
          'rotate_nightly_location failed: ${error.message}',
        );
      }
    }
  }

  static Future<void> _catchUpMissedNightly(int userId) async {
    final prefs = await SharedPreferences.getInstance();
    if (!shouldCaptureNightlyNow(prefs: prefs, userId: userId)) return;

    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return;
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 30),
        ),
      );

      final location = TrackingLocation(
        lat: position.latitude,
        lng: position.longitude,
        accuracy: position.accuracy,
        capturedAt: DateTime.now().toUtc(),
      );

      await rotateNightlyLocation(userId: userId, location: location);
      await markNightlyCaptured(prefs: prefs, userId: userId);
    } catch (error) {
      if (kDebugMode) {
        debugPrint('catch-up nightly capture failed: $error');
      }
    }
  }

  static Future<void> _registerNightlyTask(int userId) async {
    await Workmanager().registerPeriodicTask(
      '${nightlyTaskName}_$userId',
      nightlyTaskName,
      frequency: const Duration(hours: 24),
      initialDelay: _delayUntilNext1AmColombia(),
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
      inputData: {'userId': userId},
    );
  }

  static Duration _delayUntilNext1AmColombia() {
    final nowUtc = DateTime.now().toUtc();
    final colombia = nowUtc.subtract(const Duration(hours: 5));

    var target = DateTime.utc(
      colombia.year,
      colombia.month,
      colombia.day,
      6,
    );

    if (!nowUtc.isBefore(target)) {
      target = target.add(const Duration(days: 1));
    }

    return target.difference(nowUtc);
  }

  static DateTime _nowColombia() {
    return DateTime.now().toUtc().subtract(const Duration(hours: 5));
  }

  static String _nightlyDateKey(DateTime colombia) {
    return '${colombia.year}-${colombia.month.toString().padLeft(2, '0')}-'
        '${colombia.day.toString().padLeft(2, '0')}';
  }

  static String _lastNightlyPrefsKey(int userId) =>
      '$_prefsLastNightlyPrefix$userId';

  static bool shouldCaptureNightlyNow({
    required SharedPreferences prefs,
    required int userId,
  }) {
    final colombia = _nowColombia();
    final todayKey = _nightlyDateKey(colombia);
    final lastCaptured = prefs.getString(_lastNightlyPrefsKey(userId));

    if (lastCaptured == todayKey) return false;

    final inNightlyWindow = colombia.hour == 1;
    final missedPreviousNight = lastCaptured != todayKey && colombia.hour >= 1;

    return inNightlyWindow || missedPreviousNight;
  }

  static Future<void> markNightlyCaptured({
    required SharedPreferences prefs,
    required int userId,
  }) async {
    final todayKey = _nightlyDateKey(_nowColombia());
    await prefs.setString(_lastNightlyPrefsKey(userId), todayKey);
  }

  static void _handleSeguimientoChange(int userId, bool seguimiento) {
    if (seguimiento == _seguimientoActive) return;

    _seguimientoActive = seguimiento;
    if (seguimiento) {
      unawaited(_startRealtimeStream(userId));
    } else {
      unawaited(_stopRealtimeStream());
    }
  }

  static Future<void> _startRealtimeStream(int userId) async {
    await _stopRealtimeStream();

    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return;
    }

    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 15,
      ),
    ).listen(
      (position) => _pushRealtimeLocation(userId, position),
      onError: (Object error) {
        if (kDebugMode) {
          debugPrint('realtime position stream error: $error');
        }
      },
    );
  }

  static Future<void> _stopRealtimeStream() async {
    _realtimeThrottle?.cancel();
    _realtimeThrottle = null;
    await _positionSubscription?.cancel();
    _positionSubscription = null;
    _lastRealtimePush = null;
  }

  static void _pushRealtimeLocation(int userId, Position position) {
    final now = DateTime.now();
    if (_lastRealtimePush != null &&
        now.difference(_lastRealtimePush!) < _realtimeInterval) {
      return;
    }
    _lastRealtimePush = now;

    final location = TrackingLocation(
      lat: position.latitude,
      lng: position.longitude,
      accuracy: position.accuracy,
      capturedAt: now.toUtc(),
    );

    unawaited(updateUbicacion1(userId: userId, location: location));
  }
}
