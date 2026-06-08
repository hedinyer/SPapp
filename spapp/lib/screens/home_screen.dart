import 'package:flutter/material.dart';
import 'package:spapp/screens/no_credit_home_screen.dart';
import 'package:spapp/services/credit_service.dart';
import 'package:spapp/theme/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.userId,
    required this.username,
    this.onLogout,
  });

  final int userId;
  final String username;
  final VoidCallback? onLogout;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int? _creditCount;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCredits();
  }

  Future<void> _loadCredits() async {
    final count = await CreditService.getActiveCreditCount(widget.userId);
    if (!mounted) return;

    setState(() {
      _creditCount = count;
      _isLoading = false;
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

    if (_creditCount == 0) {
      return NoCreditHomeScreen(
        username: widget.username,
        onLogout: widget.onLogout,
      );
    }

    return _CreditDashboard(
      username: widget.username,
      creditCount: _creditCount!,
      onLogout: widget.onLogout,
    );
  }
}

class _CreditDashboard extends StatelessWidget {
  const _CreditDashboard({
    required this.username,
    required this.creditCount,
    this.onLogout,
  });

  final String username;
  final int creditCount;
  final VoidCallback? onLogout;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceContainerLowest,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceContainerLowest,
        foregroundColor: AppColors.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          'Mis créditos',
          style: AppTypography.headlineLgMobile.copyWith(fontSize: 20),
        ),
        actions: [
          if (onLogout != null)
            IconButton(
              onPressed: onLogout,
              tooltip: 'Cerrar sesión',
              icon: const Icon(Icons.logout_rounded),
            ),
        ],
      ),
      body: Center(
        child: Text(
          username.isEmpty
              ? 'Tienes $creditCount crédito(s) activo(s)'
              : 'Hola, $username — $creditCount crédito(s) activo(s)',
          style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w500),
        ),
      ),
    );
  }
}
