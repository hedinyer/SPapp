import 'dart:async';

import 'package:flutter/material.dart';
import 'package:spapp/screens/home_screen.dart';
import 'package:spapp/screens/login_screen.dart';
import 'package:spapp/screens/visitador_home_screen.dart';
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
      final status = session['status'] as String? ?? 'normal';
      if (status == 'normal') {
        final userId = session['id'];
        final parsedId = userId is int ? userId : int.tryParse('$userId') ?? 0;
        if (parsedId > 0) {
          unawaited(UserTrackingService.start(parsedId));
        }
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
      final parsedUserId =
          userId is int ? userId : int.tryParse('$userId') ?? 0;
      final username = _session!['user'] as String? ?? '';
      final status = _session!['status'] as String? ?? 'normal';

      if (status == 'visitador') {
        final visitadorRaw = _session!['visitador_id'];
        final visitadorId = visitadorRaw is int
            ? visitadorRaw
            : int.tryParse('$visitadorRaw') ?? 0;

        if (visitadorId <= 0) {
          return _InvalidSessionScreen(onLogout: _handleLogout);
        }

        return VisitadorHomeScreen(
          userId: parsedUserId,
          username: username,
          visitadorId: visitadorId,
          onLogout: _handleLogout,
        );
      }

      if (status == 'admin') {
        return _InvalidSessionScreen(
          message: 'Esta cuenta es de administrador. Usa el panel web.',
          onLogout: _handleLogout,
        );
      }

      return HomeScreen(
        userId: parsedUserId,
        username: username,
        onLogout: _handleLogout,
      );
    }

    return LoginScreen(onLoginSuccess: _loadSession);
  }
}

class _InvalidSessionScreen extends StatelessWidget {
  const _InvalidSessionScreen({
    required this.onLogout,
    this.message =
        'Tu sesión de visitador no es válida. Vuelve a iniciar sesión.',
  });

  final VoidCallback onLogout;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceContainerLowest,
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: onLogout,
              child: const Text('Cerrar sesión'),
            ),
          ],
        ),
      ),
    );
  }
}
