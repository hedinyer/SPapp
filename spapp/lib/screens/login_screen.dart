import 'package:flutter/material.dart';
import 'package:spapp/screens/home_screen.dart';
import 'package:spapp/services/auth_service.dart';
import 'package:spapp/theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.onLoginSuccess});

  final VoidCallback? onLoginSuccess;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    FocusScope.of(context).unfocus();

    setState(() => _errorMessage = null);

    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final user = await AuthService.login(
        username: _usernameController.text,
        password: _passwordController.text,
      );

      if (!mounted) return;

      if (widget.onLoginSuccess != null) {
        widget.onLoginSuccess!();
      } else {
        final userId = user['id'];
        Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(
            builder: (_) => HomeScreen(
              userId: userId is int ? userId : int.tryParse('$userId') ?? 0,
              username: user['user'] as String? ?? '',
            ),
          ),
        );
      }
    } on LoginException catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = error.message);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'No se pudo iniciar sesión. Intenta de nuevo.';
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceContainerLowest,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const _LoginHeader(),
                  const SizedBox(height: AppSpacing.xxl),
                  _LoginForm(
                    formKey: _formKey,
                    usernameController: _usernameController,
                    passwordController: _passwordController,
                    isLoading: _isLoading,
                    errorMessage: _errorMessage,
                    onSubmit: _handleLogin,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LoginHeader extends StatelessWidget {
  const _LoginHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: Image.asset(
            'public/logos_login.jpeg',
            height: 80,
            fit: BoxFit.contain,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          'Bienvenido de nuevo',
          textAlign: TextAlign.center,
          style: AppTypography.headlineLgMobile,
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Ingresa tus credenciales para acceder a tu cuenta',
          textAlign: TextAlign.center,
          style: AppTypography.bodySm,
        ),
      ],
    );
  }
}

class _LoginForm extends StatelessWidget {
  const _LoginForm({
    required this.formKey,
    required this.usernameController,
    required this.passwordController,
    required this.isLoading,
    required this.errorMessage,
    required this.onSubmit,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController usernameController;
  final TextEditingController passwordController;
  final bool isLoading;
  final String? errorMessage;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (errorMessage != null) ...[
            _ErrorBanner(message: errorMessage!),
            const SizedBox(height: AppSpacing.lg),
          ],
          _LoginField(
            label: 'Usuario',
            controller: usernameController,
            hint: 'nombre.usuario',
            enabled: !isLoading,
            textInputAction: TextInputAction.next,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Ingresa tu usuario';
              }
              return null;
            },
          ),
          const SizedBox(height: AppSpacing.lg),
          _LoginField(
            label: 'Contraseña',
            controller: passwordController,
            hint: '••••••••',
            enabled: !isLoading,
            obscureText: true,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => onSubmit(),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Ingresa tu contraseña';
              }
              return null;
            },
          ),
          const SizedBox(height: AppSpacing.sm),
          _SignInButton(isLoading: isLoading, onPressed: onSubmit),
        ],
      ),
    );
  }
}

class _LoginField extends StatelessWidget {
  const _LoginField({
    required this.label,
    required this.controller,
    required this.hint,
    this.obscureText = false,
    this.textInputAction,
    this.enabled = true,
    this.validator,
    this.onFieldSubmitted,
  });

  final String label;
  final TextEditingController controller;
  final String hint;
  final bool obscureText;
  final TextInputAction? textInputAction;
  final bool enabled;
  final String? Function(String?)? validator;
  final void Function(String)? onFieldSubmitted;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTypography.labelSm),
        const SizedBox(height: AppSpacing.xs),
        DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 2,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: TextFormField(
            controller: controller,
            obscureText: obscureText,
            textInputAction: textInputAction,
            enabled: enabled,
            validator: validator,
            onFieldSubmitted: onFieldSubmitted,
            style: AppTypography.bodyMd,
            decoration: InputDecoration(
              hintText: hint,
            ),
          ),
        ),
      ],
    );
  }
}

class _SignInButton extends StatefulWidget {
  const _SignInButton({
    required this.isLoading,
    required this.onPressed,
  });

  final bool isLoading;
  final VoidCallback onPressed;

  @override
  State<_SignInButton> createState() => _SignInButtonState();
}

class _SignInButtonState extends State<_SignInButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.sm),
      child: AnimatedScale(
        scale: _pressed ? 0.98 : 1,
        duration: const Duration(milliseconds: 100),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 2,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Listener(
            onPointerDown: (_) => setState(() => _pressed = true),
            onPointerUp: (_) => setState(() => _pressed = false),
            onPointerCancel: (_) => setState(() => _pressed = false),
            child: FilledButton(
              onPressed: widget.isLoading ? null : widget.onPressed,
              style: FilledButton.styleFrom(
                backgroundColor: widget.isLoading
                    ? AppColors.primary.withValues(alpha: 0.85)
                    : AppColors.primary,
              ).copyWith(
                overlayColor: WidgetStateProperty.resolveWith((states) {
                  if (states.contains(WidgetState.hovered) ||
                      states.contains(WidgetState.pressed)) {
                    return AppColors.inverseSurface.withValues(alpha: 0.12);
                  }
                  return null;
                }),
              ),
              child: widget.isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.onPrimary,
                      ),
                    )
                  : const Text('Iniciar sesión'),
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.errorContainer,
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm + 2,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              size: 16,
              color: AppColors.onErrorContainer,
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                message,
                style: AppTypography.bodySm.copyWith(
                  color: AppColors.onErrorContainer,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
