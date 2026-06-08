import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:spapp/config/supabase_config.dart';
import 'package:spapp/screens/auth_gate.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
    ),
  );

  await Supabase.initialize(
    url: SupabaseConfig.url,
    publishableKey: SupabaseConfig.publishableKey,
  );

  runApp(const SpApp());
}

class SpApp extends StatelessWidget {
  const SpApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SP App',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const AuthGate(),
    );
  }
}
