import 'package:flutter/foundation.dart';
import 'package:spapp/models/bike_inventory.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class BikeService {
  static SupabaseClient get _client => Supabase.instance.client;

  static Future<List<BikeInventory>> fetchAvailableBikes() async {
    try {
      final response = await _client
          .from('bike_table')
          .select()
          .eq('activo', true)
          .gt('stock', 0)
          .order('modelo')
          .order('color');

      return (response as List)
          .map((row) => BikeInventory.fromJson(row as Map<String, dynamic>))
          .toList();
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('bike_table select failed: ${error.message}');
      }
      return [];
    }
  }

  static Future<BikeInventory?> fetchById(int bikeId) async {
    try {
      final response = await _client
          .from('bike_table')
          .select()
          .eq('id', bikeId)
          .maybeSingle();

      if (response == null) return null;
      return BikeInventory.fromJson(response);
    } on PostgrestException catch (error) {
      if (kDebugMode) {
        debugPrint('bike_table select by id failed: ${error.message}');
      }
      return null;
    }
  }
}
