import 'package:flutter_test/flutter_test.dart';
import 'package:spapp/config/supabase_config.dart';
import 'package:supabase/supabase.dart';

void main() {
  test('verify_login responde con credenciales validas', () async {
    final client = SupabaseClient(
      SupabaseConfig.url,
      SupabaseConfig.publishableKey,
    );

    final result = await client.rpc(
      'verify_login',
      params: {
        'p_user': 'maomao',
        'p_password': '1234',
      },
    );

    expect(result, isA<List>());
    expect((result as List), isNotEmpty);
  });
}
