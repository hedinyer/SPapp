import 'dart:async';

import 'package:flutter/material.dart';
import 'package:spapp/models/motorcycle.dart';
import 'package:spapp/screens/identity_verification_screen.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';
import 'package:spapp/widgets/motorcycle_pricing_display.dart';

class MotorcycleDetailScreen extends StatefulWidget {
  const MotorcycleDetailScreen({
    super.key,
    required this.motorcycle,
    required this.userId,
  });

  final Motorcycle motorcycle;
  final int userId;

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
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => IdentityVerificationScreen(
          userId: widget.userId,
          motorcycleName: widget.motorcycle.name,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bike = widget.motorcycle;
    final width = Responsive.width(context);
    final compact = Responsive.isCompact(context);
    final horizontalPad = Responsive.horizontalPadding(context);
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return Scaffold(
      backgroundColor: AppColors.surfaceContainerLowest,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(
          parent: AlwaysScrollableScrollPhysics(),
        ),
        slivers: [
          SliverToBoxAdapter(
            child: _GalleryHeader(
              motorcycle: bike,
              pageController: _pageController,
              currentPage: _currentPage,
              onPageChanged: _onPageChanged,
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                horizontalPad,
                Responsive.lerp(context, min: AppSpacing.lg, max: AppSpacing.xl),
                horizontalPad,
                100 + bottomInset,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (compact)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          bike.name,
                          style: AppTypography.headlineMdResponsive(width),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        _Tag(label: bike.tag),
                        const SizedBox(height: AppSpacing.md),
                        Text(bike.longDescription, style: AppTypography.bodyMd),
                      ],
                    )
                  else
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                bike.name,
                                style: AppTypography.headlineMdResponsive(width),
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Text(bike.longDescription, style: AppTypography.bodyMd),
                            ],
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        _Tag(label: bike.tag),
                      ],
                    ),
                  SizedBox(
                    height: Responsive.lerp(context, min: AppSpacing.lg, max: AppSpacing.xl),
                  ),
                  Text('DESTACADOS', style: AppTypography.eyebrow),
                  const SizedBox(height: AppSpacing.md),
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: [
                      for (final highlight in bike.highlights)
                        _HighlightChip(
                          label: highlight,
                          compact: compact,
                        ),
                    ],
                  ),
                  SizedBox(
                    height: Responsive.lerp(context, min: AppSpacing.lg, max: AppSpacing.xl),
                  ),
                  Text('FICHA TÉCNICA', style: AppTypography.eyebrow),
                  const SizedBox(height: AppSpacing.md),
                  _SpecsGrid(specs: bike.specs),
                  SizedBox(
                    height: Responsive.lerp(context, min: AppSpacing.lg, max: AppSpacing.xl),
                  ),
                  MotorcyclePricingExpanded(onRequest: _onRequestCredit),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            horizontalPad,
            AppSpacing.sm,
            horizontalPad,
            AppSpacing.sm,
          ),
          child: FilledButton(
            onPressed: _onRequestCredit,
            style: FilledButton.styleFrom(
              minimumSize: Size(double.infinity, compact ? 44 : 48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.full),
              ),
            ),
            child: Text(
              'Solicitar crédito',
              style: AppTypography.labelMd.copyWith(
                color: AppColors.onPrimary,
                fontSize: compact ? 13 : 14,
              ),
            ),
          ),
        ),
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
    final gallery = motorcycle.gallery;
    final galleryHeight = Responsive.galleryHeight(context);

    return SizedBox(
      height: galleryHeight,
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
            top: MediaQuery.paddingOf(context).top + AppSpacing.sm,
            left: Responsive.horizontalPadding(context),
            child: _CircleButton(
              icon: Icons.arrow_back_rounded,
              onPressed: () => Navigator.of(context).pop(),
              compact: Responsive.isCompact(context),
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
  const _CircleButton({
    required this.icon,
    required this.onPressed,
    this.compact = false,
  });

  final IconData icon;
  final VoidCallback onPressed;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final size = compact ? 36.0 : 40.0;

    return Material(
      color: Colors.black.withValues(alpha: 0.35),
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onPressed,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: size,
          height: size,
          child: Icon(icon, color: Colors.white, size: compact ? 18 : 20),
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
    final compact = Responsive.isCompact(context);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 10 : 12,
        vertical: compact ? 3 : 4,
      ),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        label.toUpperCase(),
        style: AppTypography.labelSm.copyWith(
          fontSize: compact ? 9 : 10,
          letterSpacing: 1.6,
          color: AppColors.onPrimary,
        ),
      ),
    );
  }
}

class _HighlightChip extends StatelessWidget {
  const _HighlightChip({
    required this.label,
    this.compact = false,
  });

  final String label;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? AppSpacing.sm + 4 : AppSpacing.md,
        vertical: compact ? AppSpacing.xs + 2 : AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: Text(
        label,
        style: AppTypography.bodySm.copyWith(
          fontSize: compact ? 12 : 14,
        ),
      ),
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
        const spacing = AppSpacing.sm;
        final columns = Responsive.specGridColumns(constraints.maxWidth);
        final itemWidth = Responsive.gridItemWidth(
          context,
          maxWidth: constraints.maxWidth,
          columns: columns,
          spacing: spacing,
        );

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final spec in specs)
              SizedBox(
                width: itemWidth,
                child: _SpecTile(spec: spec),
              ),
          ],
        );
      },
    );
  }
}

class _SpecTile extends StatelessWidget {
  const _SpecTile({required this.spec});

  final MotorcycleSpec spec;

  @override
  Widget build(BuildContext context) {
    final compact = Responsive.isCompact(context);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? AppSpacing.sm + 4 : AppSpacing.md,
        vertical: compact ? AppSpacing.sm : AppSpacing.sm + 2,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainer,
        borderRadius: BorderRadius.circular(AppRadius.xl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            spec.label.toUpperCase(),
            style: AppTypography.labelSm.copyWith(
              fontSize: compact ? 9 : 10,
              letterSpacing: 1.2,
              color: AppColors.secondary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            spec.value,
            style: AppTypography.labelMd.copyWith(
              fontWeight: FontWeight.w600,
              fontSize: compact ? 13 : 14,
            ),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
