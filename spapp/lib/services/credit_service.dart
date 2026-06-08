import 'package:supabase_flutter/supabase_flutter.dart';

class CreditService {
  static SupabaseClient get _client => Supabase.instance.client;

  static Future<int> getActiveCreditCount(int userId) async {
    try {
      final result = await _client.rpc(
        'get_user_credit_count',
        params: {'p_user_id': userId},
      );

      if (result == null) return 0;
      if (result is int) return result;
      if (result is num) return result.toInt();
      return 0;
    } on PostgrestException {
      return 0;
    } catch (_) {
      return 0;
    }
  }
}
