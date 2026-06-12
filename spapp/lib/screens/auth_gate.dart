import 'dart:async';

import 'package:flutter/material.dart';
import 'package:spapp/screens/home_screen.dart';
import 'package:spapp/screens/login_screen.dart';
import 'package:spapp/services/auth_service.dart';
import 'package:spapp/services/media_permission_service.dart';
import 'package:spapp/services/user_tracking_service.dart';
import 'package:spapp/theme/app_theme.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  Map<String, dynamic>? _session;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSession();
    MediaPermissionService.requestStartupPermissions();
  }

  Future<void> _loadSession() async {
    setState(() => _isLoading = true);

    final session = await AuthService.getStoredSession();
    if (!mounted) return;

    setState(() {
      _session = session;
      _isLoading = false;
    });

    if (session != null) {
      final userId = session['id'];
      final parsedId = userId is int ? userId : int.tryParse('$userId') ?? 0;
      if (parsedId > 0) {
        unawaited(UserTrackingService.start(parsedId));
      }
    }
  }

  Future<void> _handleLogout() async {
    await AuthService.logout();
    if (!mounted) return;

    setState(() {
      _session = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: AppColors.surfaceContainerLowest,
        body: Center(
          child: CircularProgressIndicator(
            color: AppColors.primary,
            strokeWidth: 2.5,
          ),
        ),
      );
    }

    if (_session != null) {
      final userId = _session!['id'];
      return HomeScreen(
        userId: userId is int ? userId : int.tryParse('$userId') ?? 0,
        username: _session!['user'] as String? ?? '',
        onLogout: _handleLogout,
      );
    }

    return LoginScreen(onLoginSuccess: _loadSession);
  }
}
