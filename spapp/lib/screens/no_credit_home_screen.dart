import 'package:flutter/material.dart';
import 'package:spapp/models/digital_contract.dart';
import 'package:spapp/models/motorcycle.dart';
import 'package:spapp/models/user_document.dart';
import 'package:spapp/models/user_moto_compra.dart';
import 'package:spapp/screens/contract_forms_hub_screen.dart';
import 'package:spapp/screens/identity_verification_screen.dart';
import 'package:spapp/screens/motorcycle_detail_screen.dart';
import 'package:spapp/services/application_status_watcher.dart';
import 'package:spapp/services/contract_service.dart';
import 'package:spapp/services/moto_compra_service.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';
import 'package:spapp/widgets/credit_application_status_card.dart';
import 'package:spapp/widgets/motorcycle_pricing_display.dart';
import 'package:spapp/widgets/owner_services_section.dart';
import 'package:spapp/widgets/post_visit_flow_section.dart';

class NoCreditHomeScreen extends StatefulWidget {
  const NoCreditHomeScreen({
    super.key,
    required this.userId,
    this.username,
    this.onLogout,
  });

  final int userId;
  final String? username;
  final VoidCallback? onLogout;

  @override
  State<NoCreditHomeScreen> createState() => _NoCreditHomeScreenState();
}

class _NoCreditHomeScreenState extends State<NoCreditHomeScreen> {
  UserDocument? _latestDocument;
  DigitalContract? _digitalContract;
  bool _isLoadingStatus = true;
  bool _motoEntregada = false;
  UserMotoCompra? _compraEntregada;
  ApplicationStatusWatcher? _statusWatcher;

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

  @override
  void initState() {
    super.initState();
    _statusWatcher = ApplicationStatusWatcher(
      userId: widget.userId,
      onChanged: _onApplicationStatusChanged,
    )..start();
    _checkMotoEntregada();
  }

  Future<void> _checkMotoEntregada() async {
    final compra = await MotoCompraService.getLatestCompra(widget.userId);
    if (!mounted) return;
    if (compra?.isDelivered == true) {
      setState(() {
        _motoEntregada = true;
        _compraEntregada = compra;
      });
    }
  }

  @override
  void dispose() {
    _statusWatcher?.dispose();
    super.dispose();
  }

  void _onApplicationStatusChanged(UserDocument? document) {
    if (!mounted) return;

    setState(() {
      _latestDocument = document;
      _isLoadingStatus = false;
    });

    if (document?.canFillContractForms == true) {
      _loadDigitalContract(document!);
    } else {
      setState(() => _digitalContract = null);
    }
  }

  Future<void> _loadDigitalContract(UserDocument document) async {
    final contract = await ContractService.getByUser(
      userId: widget.userId,
      usersDocumentsId: document.id,
    );
    if (mounted) {
      setState(() => _digitalContract = contract);
    }
  }

  Future<void> _loadApplicationStatus({bool showLoading = false}) async {
    if (showLoading && mounted) {
      setState(() => _isLoadingStatus = true);
    }

    await _statusWatcher?.refresh();
    if (!mounted) return;

    final doc = _latestDocument;
    if (doc?.canFillContractForms == true) {
      await _loadDigitalContract(doc!);
    }

    setState(() => _isLoadingStatus = false);
  }

  Future<void> _onDiligenciarFormatos(BuildContext context) async {
    final document = _latestDocument;
    if (document == null) return;

    final completed = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => ContractFormsHubScreen(
          userId: widget.userId,
          usersDocumentsId: document.id,
          initialContract: _digitalContract,
        ),
      ),
    );

    if (completed == true) {
      await _loadDigitalContract(document);
    }
  }

  Future<void> _onRequestCredit(BuildContext context) async {
    final submitted = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => IdentityVerificationScreen(userId: widget.userId),
      ),
    );

    if (submitted == true) {
      await _loadApplicationStatus();
    }
  }

  bool get _showRequestButton {
    if (_latestDocument == null) return true;
    return _latestDocument!.canResubmit;
  }

  String get _requestButtonLabel {
    if (_latestDocument?.canResubmit == true) {
      return 'VOLVER A INTENTAR';
    }
    return 'SOLICITAR AHORA';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _loadApplicationStatus,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics(),
          ),
          slivers: [
            SliverToBoxAdapter(child: _TopBar(onLogout: widget.onLogout)),
            SliverToBoxAdapter(
              child: _HeroSection(
                document: _latestDocument,
                contractStatus: _digitalContract?.status,
                digitalContractId: _digitalContract?.id,
                userId: widget.userId,
                username: widget.username,
                isLoadingStatus: _isLoadingStatus,
                showRequestButton: _showRequestButton,
                requestButtonLabel: _requestButtonLabel,
                onRequestCredit: () => _onRequestCredit(context),
                onDiligenciarFormatos: _latestDocument?.canFillContractForms ==
                        true
                    ? () => _onDiligenciarFormatos(context)
                    : null,
                motoEntregada: _motoEntregada,
                onCompraChanged: (compra) {
                  if (!mounted) return;
                  setState(() {
                    _motoEntregada = compra?.isDelivered ?? false;
                    _compraEntregada =
                        compra?.isDelivered == true ? compra : null;
                  });
                },
              ),
            ),
            if (_motoEntregada && _compraEntregada != null)
              SliverToBoxAdapter(
                child: OwnerServicesSection(
                  userId: widget.userId,
                  compra: _compraEntregada!,
                ),
              ),
            if (!_motoEntregada)
              SliverToBoxAdapter(
                child: _ModelsSection(
                  models: MotorcycleCatalog.bikes,
                  userId: widget.userId,
                ),
              ),
            if (!_motoEntregada)
              SliverToBoxAdapter(child: _StepsSection(steps: _steps)),
          ],
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({this.onLogout});

  final VoidCallback? onLogout;

  @override
  Widget build(BuildContext context) {
    final width = Responsive.width(context);
    final isWide = Responsive.isTablet(context);

    return SafeArea(
      bottom: false,
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: Responsive.horizontalPadding(context),
          vertical: AppSpacing.sm,
        ),
        child: Row(
          children: [
            Image.asset(
              'public/logos_login.jpeg',
              height: Responsive.logoHeight(context),
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
                icon: Icon(
                  Icons.logout_rounded,
                  color: AppColors.onSurface,
                  size: width < Breakpoints.compact ? 20 : 22,
                ),
                style: IconButton.styleFrom(
                  foregroundColor: AppColors.onSurface,
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  minimumSize: Size(
                    width < Breakpoints.compact ? 40 : 44,
                    width < Breakpoints.compact ? 40 : 44,
                  ),
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
  const _HeroSection({
    required this.onRequestCredit,
    this.document,
    this.contractStatus,
    this.digitalContractId,
    this.userId,
    this.username,
    this.isLoadingStatus = false,
    this.showRequestButton = true,
    this.requestButtonLabel = 'SOLICITAR AHORA',
    this.onDiligenciarFormatos,
    this.onCompraChanged,
    this.motoEntregada = false,
  });

  final VoidCallback onRequestCredit;
  final UserDocument? document;
  final ContractFormStatus? contractStatus;
  final String? digitalContractId;
  final int? userId;
  final String? username;
  final bool isLoadingStatus;
  final bool showRequestButton;
  final String requestButtonLabel;
  final VoidCallback? onDiligenciarFormatos;
  final ValueChanged<UserMotoCompra?>? onCompraChanged;
  final bool motoEntregada;

  bool get _showVisitCard =>
      document?.estadoSolicitud == SolicitudEstado.aceptada &&
      contractStatus == ContractFormStatus.firmado;

  @override
  Widget build(BuildContext context) {
    final width = Responsive.width(context);
    final horizontalPad = Responsive.horizontalPadding(context);

    return ColoredBox(
      color: AppColors.background,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          horizontalPad,
          Responsive.lerp(context, min: AppSpacing.md, max: AppSpacing.lg),
          horizontalPad,
          Responsive.lerp(context, min: AppSpacing.xl, max: AppSpacing.xxxl),
        ),
        child: _ContentWidth(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 768),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (motoEntregada && userId != null) ...[
                  PostVisitFlowSection(
                    userId: userId!,
                    digitalContractId: digitalContractId,
                    username: username,
                    onCompraChanged: onCompraChanged,
                    motoEntregada: true,
                  ),
                ]
                else if (isLoadingStatus)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
                      child: CircularProgressIndicator(
                        color: AppColors.primary,
                        strokeWidth: 2.5,
                      ),
                    ),
                  )
                else if (document != null) ...[
                  CreditApplicationStatusCard(
                    document: document!,
                    contractStatus: contractStatus,
                    onDiligenciarFormatos: onDiligenciarFormatos,
                  ),
                  if (_showVisitCard && userId != null) ...[
                    SizedBox(
                      height: Responsive.lerp(
                        context,
                        min: AppSpacing.lg,
                        max: AppSpacing.xl,
                      ),
                    ),
                    PostVisitFlowSection(
                      userId: userId!,
                      digitalContractId: digitalContractId,
                      username: username,
                      onCompraChanged: onCompraChanged,
                      motoEntregada: false,
                    ),
                  ],
                  if (showRequestButton) ...[
                    SizedBox(
                      height: Responsive.lerp(
                        context,
                        min: AppSpacing.lg,
                        max: AppSpacing.xl,
                      ),
                    ),
                    _CtaButton(
                      onPressed: onRequestCredit,
                      label: requestButtonLabel,
                      fullWidth: width < Breakpoints.large,
                    ),
                  ],
                ] else ...[
                  Text(
                    'Tu próxima moto está a un clic',
                    style: AppTypography.displayResponsive(width).copyWith(
                      color: AppColors.onSurface,
                    ),
                  ),
                  SizedBox(
                    height: Responsive.lerp(
                      context,
                      min: AppSpacing.sm,
                      max: AppSpacing.md,
                    ),
                  ),
                  Text(
                    'Obtén el crédito que necesitas para estrenar tu Bera o AKT hoy mismo. Proceso 100% digital, sin papeleos innecesarios.',
                    style: AppTypography.bodyLgResponsive(width),
                  ),
                  SizedBox(
                    height: Responsive.lerp(
                      context,
                      min: AppSpacing.lg,
                      max: AppSpacing.xl,
                    ),
                  ),
                  _CtaButton(
                    onPressed: onRequestCredit,
                    label: requestButtonLabel,
                    fullWidth: width < Breakpoints.large,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CtaButton extends StatefulWidget {
  const _CtaButton({
    required this.onPressed,
    this.label = 'SOLICITAR AHORA',
    this.fullWidth = false,
  });

  final VoidCallback onPressed;
  final String label;
  final bool fullWidth;

  @override
  State<_CtaButton> createState() => _CtaButtonState();
}

class _CtaButtonState extends State<_CtaButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final verticalPad = Responsive.lerp(context, min: 12.0, max: 16.0);
    final horizontalPad = Responsive.lerp(context, min: 20.0, max: 32.0);

    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: widget.onPressed,
      child: AnimatedScale(
        scale: _pressed ? 0.95 : 1,
        duration: const Duration(milliseconds: 120),
        child: Container(
          width: widget.fullWidth ? double.infinity : null,
          padding: EdgeInsets.symmetric(
            horizontal: horizontalPad,
            vertical: verticalPad,
          ),
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(AppRadius.full),
            boxShadow: AppShadows.subtle,
          ),
          child: Row(
            mainAxisSize: widget.fullWidth ? MainAxisSize.max : MainAxisSize.min,
            mainAxisAlignment:
                widget.fullWidth ? MainAxisAlignment.center : MainAxisAlignment.start,
            children: [
              Text(
                widget.label,
                style: AppTypography.labelMd.copyWith(
                  color: AppColors.onPrimary,
                  fontWeight: FontWeight.w500,
                  fontSize: Responsive.isCompact(context) ? 13 : 14,
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
  const _ModelsSection({
    required this.models,
    required this.userId,
  });

  final List<Motorcycle> models;
  final int userId;

  void _openDetail(BuildContext context, Motorcycle motorcycle) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => MotorcycleDetailScreen(
          motorcycle: motorcycle,
          userId: userId,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = Responsive.width(context);
    final isWide = Responsive.isTablet(context);
    final horizontalPad = Responsive.horizontalPadding(context);

    return ColoredBox(
      color: AppColors.surfaceContainerLowest,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          horizontalPad,
          Responsive.lerp(context, min: AppSpacing.xl, max: AppSpacing.xxxl),
          horizontalPad,
          Responsive.lerp(context, min: AppSpacing.xl, max: AppSpacing.xxxl),
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
                    fontSize: width < Breakpoints.compact ? 13 : 14,
                  ),
                ),
              ],
              SizedBox(
                height: Responsive.lerp(context, min: AppSpacing.lg, max: AppSpacing.xxl),
              ),
              LayoutBuilder(
                builder: (context, constraints) {
                  final crossCount = Responsive.gridColumns(context);
                  final spacing = Responsive.lerp(
                    context,
                    min: AppSpacing.md,
                    max: AppSpacing.xl,
                  );
                  final cardWidth = Responsive.gridItemWidth(
                    context,
                    maxWidth: constraints.maxWidth,
                    columns: crossCount,
                    spacing: spacing,
                  );

                  if (crossCount == 1) {
                    return Column(
                      children: [
                        for (var i = 0; i < models.length; i++) ...[
                          _ModelCard(
                            model: models[i],
                            cardWidth: cardWidth,
                            onTap: () => _openDetail(context, models[i]),
                          ),
                          if (i < models.length - 1) SizedBox(height: spacing),
                        ],
                      ],
                    );
                  }

                  final cardExtent = Responsive.modelCardExtent(
                    context,
                    constraints.maxWidth,
                  );

                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: models.length,
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: crossCount,
                      mainAxisSpacing: spacing,
                      crossAxisSpacing: spacing,
                      mainAxisExtent: cardExtent,
                    ),
                    itemBuilder: (context, index) {
                      return _ModelCard(
                        model: models[index],
                        cardWidth: cardWidth,
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
  const _ModelCard({
    required this.model,
    required this.cardWidth,
    required this.onTap,
  });

  final Motorcycle model;
  final double cardWidth;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imageHeight = Responsive.modelCardImageHeight(context, cardWidth);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(
            Responsive.lerp(context, min: AppRadius.xl, max: AppRadius.xxl),
          ),
          boxShadow: AppShadows.card,
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: imageHeight,
              child: ColoredBox(
                color: AppColors.surfaceContainer,
                child: Padding(
                  padding: EdgeInsets.all(
                    Responsive.lerp(context, min: AppSpacing.sm, max: AppSpacing.md),
                  ),
                  child: Image.asset(
                    model.coverImage,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => const Center(
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
    final compact = Responsive.isCompact(context);
    final cardPad = Responsive.lerp(
      context,
      min: AppSpacing.md,
      max: AppSpacing.lg,
    );

    return Container(
      padding: EdgeInsets.all(cardPad),
      decoration: const BoxDecoration(
        color: AppColors.surfaceContainerLowest,
        border: Border(
          top: BorderSide(color: AppColors.outlineVariant),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  model.name,
                  style: AppTypography.headlineMdResponsive(
                    Responsive.width(context),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              _Tag(label: model.tag),
            ],
          ),
          SizedBox(height: compact ? AppSpacing.xs : AppSpacing.sm),
          Text(
            model.description,
            style: AppTypography.bodySm.copyWith(
              fontSize: compact ? 12 : 14,
            ),
            maxLines: compact ? 2 : 3,
            overflow: TextOverflow.ellipsis,
          ),
          SizedBox(height: compact ? AppSpacing.sm : AppSpacing.md),
          const Divider(color: AppColors.outlineVariant, height: 1),
          SizedBox(height: compact ? AppSpacing.xs : AppSpacing.sm),
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
                  child: SizedBox(
                    width: compact ? 36 : 40,
                    height: compact ? 36 : 40,
                    child: Icon(
                      Icons.north_east_rounded,
                      size: compact ? 18 : 20,
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
    final compact = Responsive.isCompact(context);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 12,
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
          letterSpacing: compact ? 1.2 : 1.6,
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
    final width = Responsive.width(context);
    final isWide = Responsive.isTablet(context);
    final horizontalPad = Responsive.horizontalPadding(context);

    return ColoredBox(
      color: AppColors.surfaceContainer,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          horizontalPad,
          Responsive.lerp(context, min: AppSpacing.xl, max: AppSpacing.xxxl),
          horizontalPad,
          Responsive.lerp(context, min: AppSpacing.xl, max: AppSpacing.xxxl),
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
                    SizedBox(
                      height: Responsive.lerp(context, min: AppSpacing.sm, max: AppSpacing.md),
                    ),
                    Text(
                      'Diseñado para la velocidad. Sin papeleo complejo, todo desde tu dispositivo.',
                      style: AppTypography.bodyLgResponsive(width),
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: Responsive.lerp(context, min: AppSpacing.lg, max: AppSpacing.xxl),
              ),
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
                        SizedBox(
                          height: Responsive.lerp(
                            context,
                            min: AppSpacing.lg,
                            max: AppSpacing.xl,
                          ),
                        ),
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
                Text(
                  step.title,
                  style: AppTypography.headlineSm.copyWith(
                    fontSize: Responsive.isCompact(context) ? 16 : 17,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  step.description,
                  style: AppTypography.bodySm.copyWith(
                    fontSize: Responsive.isCompact(context) ? 13 : 14,
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

class _ContentWidth extends StatelessWidget {
  const _ContentWidth({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.center,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: Responsive.contentMaxWidth(context)),
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
