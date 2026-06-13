import 'package:flutter/foundation.dart';
import 'package:spapp/services/local_cache_service.dart';
import 'package:spapp/services/network_resilience.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class CreditService {
  static SupabaseClient get _client => Supabase.instance.client;

  static Future<int> getActiveCreditCount(
    int userId, {
    bool forceRefresh = false,
  }) async {
    final cacheKey = LocalCacheService.creditCountKey(userId);

    if (!forceRefresh) {
      final cached = await LocalCacheService.getInt(cacheKey);
      if (cached != null) return cached;
    }

    try {
      final result = await NetworkResilience.runWithRetry(
        () => _client.rpc(
          'get_user_credit_count',
          params: {'p_user_id': userId},
        ),
        debugLabel: 'get_user_credit_count',
      );

      final count = _parseCount(result);
      await LocalCacheService.setInt(cacheKey, count);
      return count;
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('get_user_credit_count failed: ${error.message}');
      }
    } catch (error) {
      if (kDebugMode) {
        debugPrint('get_user_credit_count failed: $error');
      }
    }

    return await LocalCacheService.getInt(cacheKey) ?? 0;
  }

  static int _parseCount(dynamic result) {
    if (result == null) return 0;
    if (result is int) return result;
    if (result is num) return result.toInt();
    return 0;
  }
}
