import 'dart:async';

import 'package:flutter/material.dart';
import 'package:spapp/models/motorcycle.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/widgets/motorcycle_pricing_display.dart';

class MotorcycleDetailScreen extends StatefulWidget {
  const MotorcycleDetailScreen({super.key, required this.motorcycle});

  final Motorcycle motorcycle;

  @override
  State<MotorcycleDetailScreen> createState() => _MotorcycleDetailScreenState();
}

class _MotorcycleDetailScreenState extends State<MotorcycleDetailScreen> {
  final _pageController = PageController();
  int _currentPage = 0;
  Timer? _autoPlayTimer;

  static const _autoPlayInterval = Duration(seconds: 3);

  @override
  void initState() {
    super.initState();
    _startAutoPlay();
  }

  void _startAutoPlay() {
    final gallery = widget.motorcycle.gallery;
    if (gallery.length <= 1) return;

    _autoPlayTimer?.cancel();
    _autoPlayTimer = Timer.periodic(_autoPlayInterval, (_) => _advanceCarousel());
  }

  void _advanceCarousel() {
    if (!_pageController.hasClients) return;

    final gallery = widget.motorcycle.gallery;
    final nextPage = (_currentPage + 1) % gallery.length;

    _pageController.animateToPage(
      nextPage,
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeInOut,
    );
  }

  void _onPageChanged(int index) {
    setState(() => _currentPage = index);
    _startAutoPlay();
  }

  @override
  void dispose() {
    _autoPlayTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _onRequestCredit() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Próximamente: solicitud de crédito para ${widget.motorcycle.name}',
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
    final bike = widget.motorcycle;

    return Scaffold(
      backgroundColor: AppColors.surfaceContainerLowest,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(
          parent: AlwaysScrollableScrollPhysics(),
        ),
        slivers: [
          SliverToBoxAdapter(child: _GalleryHeader(
            motorcycle: bike,
            pageController: _pageController,
            currentPage: _currentPage,
            onPageChanged: _onPageChanged,
          )),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.xl,
                AppSpacing.lg,
                AppSpacing.xxxl,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(bike.name, style: AppTypography.headlineLg),
                            const SizedBox(height: AppSpacing.sm),
                            Text(bike.longDescription, style: AppTypography.bodyMd),
                          ],
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      _Tag(label: bike.tag),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Text('DESTACADOS', style: AppTypography.eyebrow),
                  const SizedBox(height: AppSpacing.md),
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: [
                      for (final highlight in bike.highlights)
                        _HighlightChip(label: highlight),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Text('FICHA TÉCNICA', style: AppTypography.eyebrow),
                  const SizedBox(height: AppSpacing.md),
                  _SpecsGrid(specs: bike.specs),
                  const SizedBox(height: AppSpacing.xl),
                  MotorcyclePricingExpanded(onRequest: _onRequestCredit),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GalleryHeader extends StatelessWidget {
  const _GalleryHeader({
    required this.motorcycle,
    required this.pageController,
    required this.currentPage,
    required this.onPageChanged,
  });

  final Motorcycle motorcycle;
  final PageController pageController;
  final int currentPage;
  final ValueChanged<int> onPageChanged;

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;
    final gallery = motorcycle.gallery;

    return SizedBox(
      height: 380 + topInset,
      child: Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            controller: pageController,
            itemCount: gallery.length,
            onPageChanged: onPageChanged,
            itemBuilder: (context, index) {
              return ColoredBox(
                color: AppColors.surfaceContainer,
                child: Image.asset(
                  gallery[index],
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => const Center(
                    child: Icon(
                      Icons.two_wheeler_outlined,
                      size: 64,
                      color: AppColors.outline,
                    ),
                  ),
                ),
              );
            },
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.45),
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.25),
                ],
              ),
            ),
          ),
          Positioned(
            top: topInset + AppSpacing.sm,
            left: AppSpacing.md,
            child: _CircleButton(
              icon: Icons.arrow_back_rounded,
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
          Positioned(
            bottom: AppSpacing.lg,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < gallery.length; i++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: currentPage == i ? 20 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: currentPage == i
                          ? Colors.white
                          : Colors.white.withValues(alpha: 0.45),
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CircleButton extends StatelessWidget {
  const _CircleButton({required this.icon, required this.onPressed});

  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.35),
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onPressed,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 40,
          height: 40,
          child: Icon(icon, color: Colors.white, size: 20),
        ),
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
        ),
      ),
    );
  }
}

class _HighlightChip extends StatelessWidget {
  const _HighlightChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: Text(label, style: AppTypography.bodySm),
    );
  }
}

class _SpecsGrid extends StatelessWidget {
  const _SpecsGrid({required this.specs});

  final List<MotorcycleSpec> specs;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final crossCount = constraints.maxWidth >= 480 ? 2 : 1;

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: specs.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossCount,
            mainAxisSpacing: AppSpacing.sm,
            crossAxisSpacing: AppSpacing.sm,
            childAspectRatio: crossCount == 2 ? 3.2 : 4.5,
          ),
          itemBuilder: (context, index) {
            final spec = specs[index];
            return Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm + 2,
              ),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainer,
                borderRadius: BorderRadius.circular(AppRadius.xl),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    spec.label.toUpperCase(),
                    style: AppTypography.labelSm.copyWith(
                      fontSize: 10,
                      letterSpacing: 1.2,
                      color: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    spec.value,
                    style: AppTypography.labelMd.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
