import 'package:flutter/material.dart';
import 'package:spapp/models/motorcycle.dart';
import 'package:spapp/screens/motorcycle_detail_screen.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/widgets/motorcycle_pricing_display.dart';

class NoCreditHomeScreen extends StatelessWidget {
  const NoCreditHomeScreen({
    super.key,
    this.username,
    this.onLogout,
  });

  final String? username;
  final VoidCallback? onLogout;

  static const _steps = [
    _StepItem(
      label: 'PASO 01',
      title: 'Regístrate',
      description:
          'Crea tu cuenta con tus datos básicos y documento de identidad en minutos.',
    ),
    _StepItem(
      label: 'PASO 02',
      title: 'Evaluación Rápida',
      description:
          'Nuestro sistema analiza tu perfil al instante sin afectar tu historial crediticio.',
    ),
    _StepItem(
      label: 'PASO 03',
      title: 'Retira tu Moto',
      description:
          'Acércate al concesionario aliado, firma y sal manejando tu nueva moto.',
    ),
  ];

  void _onRequestCredit(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Próximamente: solicitud de crédito',
          style: AppTypography.bodySm.copyWith(color: AppColors.onPrimary),
        ),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(AppSpacing.lg),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.full),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(
          parent: AlwaysScrollableScrollPhysics(),
        ),
        slivers: [
          SliverToBoxAdapter(child: _TopBar(onLogout: onLogout)),
          SliverToBoxAdapter(
            child: _HeroSection(
              onRequestCredit: () => _onRequestCredit(context),
            ),
          ),
          SliverToBoxAdapter(
            child: _ModelsSection(models: MotorcycleCatalog.bikes),
          ),
          SliverToBoxAdapter(child: _StepsSection(steps: _steps)),
        ],
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({this.onLogout});

  final VoidCallback? onLogout;

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 768;

    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        child: Row(
          children: [
            Image.asset(
              'public/logos_login.jpeg',
              height: 36,
              fit: BoxFit.contain,
            ),
            const Spacer(),
            if (isWide) ...[
              _NavLink(label: 'Home', active: true),
              const SizedBox(width: AppSpacing.lg),
              _NavLink(label: 'Identity'),
              const SizedBox(width: AppSpacing.lg),
              _NavLink(label: 'Settings'),
              const SizedBox(width: AppSpacing.lg),
            ],
            if (onLogout != null)
              IconButton(
                onPressed: onLogout,
                tooltip: 'Cerrar sesión',
                icon: const Icon(
                  Icons.logout_rounded,
                  color: AppColors.onSurface,
                  size: 22,
                ),
                style: IconButton.styleFrom(
                  foregroundColor: AppColors.onSurface,
                  padding: const EdgeInsets.all(AppSpacing.sm),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _NavLink extends StatelessWidget {
  const _NavLink({required this.label, this.active = false});

  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Text(
      label.toUpperCase(),
      style: AppTypography.navLink.copyWith(
        color: active ? AppColors.primary : AppColors.secondary,
      ),
    );
  }
}

class _HeroSection extends StatelessWidget {
  const _HeroSection({required this.onRequestCredit});

  final VoidCallback onRequestCredit;

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final horizontalPad = size.width >= 768 ? AppSpacing.xxl : AppSpacing.md;

    return ColoredBox(
      color: AppColors.background,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          horizontalPad,
          AppSpacing.lg,
          horizontalPad,
          AppSpacing.xxxl,
        ),
        child: _ContentWidth(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 768),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Tu próxima moto está a un clic',
                  style: AppTypography.displayResponsive(size.width).copyWith(
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Obtén el crédito que necesitas para estrenar tu Bera o AKT hoy mismo. Proceso 100% digital, sin papeleos innecesarios.',
                  style: AppTypography.bodyLg,
                ),
                const SizedBox(height: AppSpacing.xl),
                _CtaButton(onPressed: onRequestCredit),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CtaButton extends StatefulWidget {
  const _CtaButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  State<_CtaButton> createState() => _CtaButtonState();
}

class _CtaButtonState extends State<_CtaButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: widget.onPressed,
      child: AnimatedScale(
        scale: _pressed ? 0.95 : 1,
        duration: const Duration(milliseconds: 120),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xl,
            vertical: AppSpacing.md,
          ),
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(AppRadius.full),
            boxShadow: AppShadows.subtle,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'SOLICITAR AHORA',
                style: AppTypography.labelMd.copyWith(
                  color: AppColors.onPrimary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              const Icon(
                Icons.arrow_forward_rounded,
                size: 18,
                color: AppColors.onPrimary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ModelsSection extends StatelessWidget {
  const _ModelsSection({required this.models});

  final List<Motorcycle> models;

  void _openDetail(BuildContext context, Motorcycle motorcycle) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => MotorcycleDetailScreen(motorcycle: motorcycle),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final isWide = width >= 768;
    final horizontalPad = isWide ? AppSpacing.xxl : AppSpacing.md;

    return ColoredBox(
      color: AppColors.surfaceContainerLowest,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          horizontalPad,
          AppSpacing.xxxl,
          horizontalPad,
          AppSpacing.xxxl,
        ),
        child: _ContentWidth(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (isWide)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Text(
                        'Modelos Destacados',
                        style: AppTypography.headlineLgResponsive(width),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.lg),
                    Expanded(
                      child: Text(
                        'Seleccionados para tu estilo de vida, con las mejores condiciones de financiamiento.',
                        textAlign: TextAlign.right,
                        style: AppTypography.bodySm.copyWith(
                          color: AppColors.secondary,
                        ),
                      ),
                    ),
                  ],
                )
              else ...[
                Text(
                  'Modelos Destacados',
                  style: AppTypography.headlineLgResponsive(width),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Seleccionados para tu estilo de vida, con las mejores condiciones de financiamiento.',
                  style: AppTypography.bodySm.copyWith(
                    color: AppColors.secondary,
                  ),
                ),
              ],
              SizedBox(height: isWide ? AppSpacing.xxl : AppSpacing.xl),
              LayoutBuilder(
                builder: (context, constraints) {
                  final crossCount = constraints.maxWidth >= 640 ? 2 : 1;
                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: models.length,
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: crossCount,
                      mainAxisSpacing: AppSpacing.xl,
                      crossAxisSpacing: AppSpacing.xl,
                      mainAxisExtent: crossCount == 2 ? 440 : 480,
                    ),
                    itemBuilder: (context, index) {
                      return _ModelCard(
                        model: models[index],
                        onTap: () => _openDetail(context, models[index]),
                      );
                    },
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ModelCard extends StatelessWidget {
  const _ModelCard({required this.model, required this.onTap});

  final Motorcycle model;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(AppRadius.xxl),
          boxShadow: AppShadows.card,
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: ColoredBox(
                color: AppColors.surfaceContainer,
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Image.asset(
                    model.coverImage,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) =>
                        const Center(
                      child: Icon(
                        Icons.two_wheeler_outlined,
                        size: 48,
                        color: AppColors.outline,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            _InfoCard(model: model, onTap: onTap),
          ],
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.model, required this.onTap});

  final Motorcycle model;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: const BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        border: Border(
          top: BorderSide(color: AppColors.outlineVariant),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(model.name, style: AppTypography.headlineMd),
              ),
              const SizedBox(width: AppSpacing.sm),
              _Tag(label: model.tag),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            model.description,
            style: AppTypography.bodySm,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: AppSpacing.md),
          const Divider(color: AppColors.outlineVariant, height: 1),
          const SizedBox(height: AppSpacing.sm),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Expanded(child: MotorcyclePricingCompact()),
              const SizedBox(width: AppSpacing.sm),
              Material(
                color: AppColors.primary,
                shape: const CircleBorder(),
                child: InkWell(
                  onTap: onTap,
                  customBorder: const CircleBorder(),
                  child: const SizedBox(
                    width: 40,
                    height: 40,
                    child: Icon(
                      Icons.north_east_rounded,
                      size: 20,
                      color: AppColors.onPrimary,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        label.toUpperCase(),
        style: AppTypography.labelSm.copyWith(
          fontSize: 10,
          letterSpacing: 1.6,
          color: AppColors.onPrimary,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
    );
  }
}

class _StepsSection extends StatelessWidget {
  const _StepsSection({required this.steps});

  final List<_StepItem> steps;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final isWide = width >= 768;
    final horizontalPad = isWide ? AppSpacing.xxl : AppSpacing.md;

    return ColoredBox(
      color: AppColors.surfaceContainer,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          horizontalPad,
          AppSpacing.xxxl,
          horizontalPad,
          AppSpacing.xxxl,
        ),
        child: _ContentWidth(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: isWide ? width * 0.5 : double.infinity,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Aprobación\nen 3 pasos',
                      style: AppTypography.headlineLgResponsive(width),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      'Diseñado para la velocidad. Sin papeleo complejo, todo desde tu dispositivo.',
                      style: AppTypography.bodyLg,
                    ),
                  ],
                ),
              ),
              SizedBox(height: isWide ? AppSpacing.xxl : AppSpacing.xl),
              if (isWide)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: _StepColumn(step: steps[0], offset: 0)),
                    const SizedBox(width: AppSpacing.xl),
                    Expanded(
                      child: _StepColumn(step: steps[1], offset: AppSpacing.xl),
                    ),
                    const SizedBox(width: AppSpacing.xl),
                    Expanded(
                      child: _StepColumn(step: steps[2], offset: AppSpacing.xxl),
                    ),
                  ],
                )
              else
                Column(
                  children: [
                    for (var i = 0; i < steps.length; i++) ...[
                      _StepColumn(step: steps[i], offset: 0),
                      if (i < steps.length - 1)
                        const SizedBox(height: AppSpacing.xl),
                    ],
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StepColumn extends StatelessWidget {
  const _StepColumn({required this.step, required this.offset});

  final _StepItem step;
  final double offset;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(top: offset),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          const Positioned(
            left: -1,
            top: 0,
            bottom: 0,
            child: SizedBox(
              width: 1,
              child: ColoredBox(color: AppColors.outlineVariant),
            ),
          ),
          Positioned(
            left: -5,
            top: 0,
            child: Container(
              width: 9,
              height: 9,
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(left: AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(step.label, style: AppTypography.stepLabel),
                const SizedBox(height: AppSpacing.sm),
                Text(step.title, style: AppTypography.headlineSm),
                const SizedBox(height: AppSpacing.xs),
                Text(step.description, style: AppTypography.bodySm),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ContentWidth extends StatelessWidget {
  const _ContentWidth({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.center,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: AppSpacing.containerMax),
        child: child,
      ),
    );
  }
}

class _StepItem {
  const _StepItem({
    required this.label,
    required this.title,
    required this.description,
  });

  final String label;
  final String title;
  final String description;
}
