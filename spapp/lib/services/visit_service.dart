import 'package:flutter/foundation.dart';
import 'package:spapp/models/visita.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class VisitService {
  static SupabaseClient get _client => Supabase.instance.client;

  static Future<Visita?> getLatestVisit(int userId) async {
    try {
      final response = await _client
          .from('visitas')
          .select('*, visitadores(*)')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(1)
          .maybeSingle();

      if (response == null) return null;
      return Visita.fromJson(response);
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('visitas select failed: ${error.message}');
      }
      return null;
    }
  }

  static RealtimeChannel subscribeToVisits({
    required int userId,
    required VoidCallback onChanged,
  }) {
    final channel = _client.channel('visitas_$userId');

    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'visitas',
          callback: (payload) {
            final newUserId = payload.newRecord['user_id'];
            final oldUserId = payload.oldRecord['user_id'];
            final matchesUser = newUserId == userId ||
                newUserId?.toString() == userId.toString() ||
                oldUserId == userId ||
                oldUserId?.toString() == userId.toString();

            if (!matchesUser) return;

            if (kDebugMode) {
              debugPrint(
                'visitas realtime (${payload.eventType.name}): '
                '${payload.newRecord}',
              );
            }
            onChanged();
          },
        )
        .subscribe((status, error) {
          if (kDebugMode) {
            debugPrint('visitas channel status: $status, error: $error');
          }
        });

    return channel;
  }

  static Future<void> unsubscribe(RealtimeChannel? channel) async {
    if (channel == null) return;
    await _client.removeChannel(channel);
  }
}
