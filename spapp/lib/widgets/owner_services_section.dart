import 'package:flutter/material.dart';

import 'package:spapp/models/user_moto_compra.dart';

import 'package:spapp/screens/cambio_aceite_screen.dart';

import 'package:spapp/screens/reparacion_request_screen.dart';

import 'package:spapp/screens/repuestos_catalog_screen.dart';

import 'package:spapp/theme/app_theme.dart';

import 'package:spapp/theme/responsive.dart';

import 'package:spapp/widgets/mis_solicitudes_section.dart';

import 'package:spapp/widgets/solicitudes_taller_listener.dart';



class OwnerServicesSection extends StatelessWidget {

  const OwnerServicesSection({

    super.key,

    required this.userId,

    required this.compra,

  });



  final int userId;

  final UserMotoCompra compra;



  @override

  Widget build(BuildContext context) {

    final horizontalPad = Responsive.horizontalPadding(context);



    return ColoredBox(

      color: AppColors.background,

      child: Padding(

        padding: EdgeInsets.fromLTRB(

          horizontalPad,

          Responsive.lerp(context, min: AppSpacing.lg, max: AppSpacing.xl),

          horizontalPad,

          Responsive.lerp(context, min: AppSpacing.xl, max: AppSpacing.xxxl),

        ),

        child: SolicitudesTallerListener(

          userId: userId,

          builder: (context, solicitudes, isLoading, refresh) {

            return Column(

              crossAxisAlignment: CrossAxisAlignment.start,

              children: [

                Text(

                  'Servicios para tu moto',

                  style: AppTypography.headlineLgMobile.copyWith(

                    fontSize: Responsive.lerp(context, min: 20, max: 24),

                    color: AppColors.onSurface,

                  ),

                ),

                const SizedBox(height: AppSpacing.md),

                _ServiceCard(

                  icon: Icons.build_circle_outlined,

                  title: 'Solicitar repuestos',

                  description:

                      'Explora el catálogo y pide los repuestos que necesitas.',

                  color: const Color(0xFF1565C0),

                  onTap: () => _openServiceScreen(

                    context,

                    refresh,

                    RepuestosCatalogScreen(

                      userId: userId,

                      compra: compra,

                    ),

                  ),

                ),

                const SizedBox(height: AppSpacing.sm),

                _ServiceCard(

                  icon: Icons.handyman_outlined,

                  title: 'Reparaciones',

                  description: 'Reporta una falla y solicita revisión en taller.',

                  color: const Color(0xFFE65100),

                  onTap: () => _openServiceScreen(

                    context,

                    refresh,

                    ReparacionRequestScreen(

                      userId: userId,

                      compra: compra,

                    ),

                  ),

                ),

                const SizedBox(height: AppSpacing.sm),

                _ServiceCard(

                  icon: Icons.oil_barrel_outlined,

                  title: 'Agendar cambio de aceite',

                  description: 'Programa el mantenimiento de tu moto.',

                  color: const Color(0xFF1B7A3D),

                  onTap: () => _openServiceScreen(

                    context,

                    refresh,

                    CambioAceiteScreen(

                      userId: userId,

                      compra: compra,

                    ),

                  ),

                ),

                MisSolicitudesSection(

                  solicitudes: solicitudes,

                  isLoading: isLoading,

                ),

              ],

            );

          },

        ),

      ),

    );

  }



  Future<void> _openServiceScreen(

    BuildContext context,

    Future<void> Function() refresh,

    Widget screen,

  ) async {

    final created = await Navigator.of(context).push<bool>(

      MaterialPageRoute<bool>(builder: (_) => screen),

    );



    if (created == true) {

      await refresh();

    }

  }

}



class _ServiceCard extends StatelessWidget {

  const _ServiceCard({

    required this.icon,

    required this.title,

    required this.description,

    required this.color,

    required this.onTap,

  });



  final IconData icon;

  final String title;

  final String description;

  final Color color;

  final VoidCallback onTap;



  @override

  Widget build(BuildContext context) {

    return Material(

      color: AppColors.background,

      borderRadius: BorderRadius.circular(AppRadius.lg),

      child: InkWell(

        onTap: onTap,

        borderRadius: BorderRadius.circular(AppRadius.lg),

        child: Container(

          padding: const EdgeInsets.all(AppSpacing.md),

          decoration: BoxDecoration(

            borderRadius: BorderRadius.circular(AppRadius.lg),

            border: Border.all(color: color.withValues(alpha: 0.2)),

          ),

          child: Row(

            children: [

              Container(

                width: 48,

                height: 48,

                decoration: BoxDecoration(

                  color: color.withValues(alpha: 0.1),

                  borderRadius: BorderRadius.circular(AppRadius.xl),

                ),

                child: Icon(icon, color: color),

              ),

              const SizedBox(width: AppSpacing.md),

              Expanded(

                child: Column(

                  crossAxisAlignment: CrossAxisAlignment.start,

                  children: [

                    Text(

                      title,

                      style: AppTypography.labelMd.copyWith(

                        fontWeight: FontWeight.w600,

                      ),

                    ),

                    const SizedBox(height: AppSpacing.xs),

                    Text(

                      description,

                      style: AppTypography.bodySm.copyWith(

                        color: AppColors.secondary,

                      ),

                    ),

                  ],

                ),

              ),

              Icon(Icons.chevron_right_rounded, color: AppColors.secondary),

            ],

          ),

        ),

      ),

    );

  }

}


