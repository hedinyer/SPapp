import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:spapp/config/supabase_config.dart';
import 'package:spapp/models/user_tracking.dart';
import 'package:spapp/services/user_tracking_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:workmanager/workmanager.dart';

@pragma('vm:entry-point')
void trackingBackgroundCallback() {
  Workmanager().executeTask((taskName, inputData) async {
    try {
      await Supabase.initialize(
        url: SupabaseConfig.url,
        publishableKey: SupabaseConfig.publishableKey,
        debug: kDebugMode,
      );

      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getInt(UserTrackingService.prefsUserIdKey);
      if (userId == null) return true;

      final shouldCapture = UserTrackingService.shouldCaptureNightlyNow(
        prefs: prefs,
        userId: userId,
      );
      if (!shouldCapture) return true;

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 45),
        ),
      );

      final location = TrackingLocation(
        lat: position.latitude,
        lng: position.longitude,
        accuracy: position.accuracy,
        capturedAt: DateTime.now().toUtc(),
      );

      await UserTrackingService.rotateNightlyLocation(
        userId: userId,
        location: location,
      );

      await UserTrackingService.markNightlyCaptured(
        prefs: prefs,
        userId: userId,
      );

      return true;
    } catch (error, stackTrace) {
      if (kDebugMode) {
        debugPrint('tracking background task failed: $error');
        debugPrint('$stackTrace');
      }
      return false;
    }
  });
}
