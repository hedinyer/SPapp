import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:spapp/background/tracking_background.dart';
import 'package:spapp/config/supabase_config.dart';
import 'package:spapp/screens/auth_gate.dart';
import 'package:spapp/services/connectivity_service.dart';
import 'package:spapp/services/network_resilience.dart';
import 'package:spapp/services/offline_queue_service.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';
import 'package:spapp/widgets/connectivity_banner.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:workmanager/workmanager.dart';

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
    debug: kDebugMode,
    httpClient: NetworkResilience.createHttpClient(),
  );

  await ConnectivityService.instance.start();
  await OfflineQueueService.init();
  unawaited(OfflineQueueService.processQueue());

  await Workmanager().initialize(
    trackingBackgroundCallback,
    isInDebugMode: kDebugMode,
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
      locale: const Locale('es', 'CO'),
      supportedLocales: const [
        Locale('es', 'CO'),
        Locale('es'),
        Locale('en'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      builder: (context, child) => ConnectivityBanner(
        child: ResponsiveScope(
          maxScale: 1.1,
          child: child ?? const SizedBox(),
        ),
      ),
      home: const AuthGate(),
    );
  }
}
