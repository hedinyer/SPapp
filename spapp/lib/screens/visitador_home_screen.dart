import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:spapp/models/visita.dart';
import 'package:spapp/screens/visita_ejecucion_screen.dart';
import 'package:spapp/services/auth_service.dart';
import 'package:spapp/services/visitador_visit_service.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class VisitadorHomeScreen extends StatefulWidget {
  const VisitadorHomeScreen({
    super.key,
    required this.userId,
    required this.username,
    required this.visitadorId,
    required this.onLogout,
  });

  final int userId;
  final String username;
  final int visitadorId;
  final VoidCallback onLogout;

  @override
  State<VisitadorHomeScreen> createState() => _VisitadorHomeScreenState();
}

class _VisitadorHomeScreenState extends State<VisitadorHomeScreen> {
  List<Visita> _visitas = [];
  bool _loading = true;
  String? _error;
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    _loadVisitas();
    _channel = VisitadorVisitService.subscribeToAssignedVisits(
      visitadorId: widget.visitadorId,
      onChanged: _loadVisitas,
    );
  }

  @override
  void dispose() {
    unawaited(VisitadorVisitService.unsubscribe(_channel));
    super.dispose();
  }

  Future<void> _loadVisitas() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final visitas =
          await VisitadorVisitService.getAssignedVisits(widget.visitadorId);
      if (!mounted) return;
      setState(() {
        _visitas = visitas;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _handleLogout() async {
    await AuthService.logout();
    widget.onLogout();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceContainerLowest,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceContainerLowest,
        elevation: 0,
        title: const Text('Mis visitas'),
        actions: [
          IconButton(
            onPressed: _handleLogout,
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesión',
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _loadVisitas,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading && _visitas.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 120),
          Center(child: CircularProgressIndicator(color: AppColors.primary)),
        ],
      );
    }

    if (_error != null && _visitas.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Text(
            _error!,
            style: const TextStyle(color: AppColors.error),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.md),
          Center(
            child: FilledButton(
              onPressed: _loadVisitas,
              child: const Text('Reintentar'),
            ),
          ),
        ],
      );
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        Text(
          'Hola, ${widget.username}',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          _visitas.isEmpty
              ? 'No tienes visitas asignadas por ahora.'
              : '${_visitas.length} visita(s) pendiente(s)',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: AppSpacing.lg),
        if (_visitas.isEmpty)
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.surfaceContainerLow,
              borderRadius: BorderRadius.circular(AppRadius.xxl),
            ),
            child: const Text(
              'Cuando el administrador te asigne una visita, aparecerá aquí.',
              textAlign: TextAlign.center,
            ),
          )
        else
          ..._visitas.map(_buildVisitaCard),
      ],
    );
  }

  Widget _buildVisitaCard(Visita visita) {
    final fecha = visita.fechaProgramada != null
        ? DateFormat('d MMM y, HH:mm').format(visita.fechaProgramada!.toLocal())
        : 'Sin fecha programada';

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Material(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.xxl),
          onTap: () async {
            final completed = await Navigator.of(context).push<bool>(
              MaterialPageRoute(
                builder: (_) => VisitaEjecucionScreen(
                  visita: visita,
                  visitadorId: widget.visitadorId,
                ),
              ),
            );
            if (completed == true) {
              await _loadVisitas();
            }
          },
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        visita.clienteNombre ?? 'Cliente',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.location_on_outlined,
                            size: 16,
                            color: AppColors.onSurfaceVariant,
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          Expanded(
                            child: Text(
                              visita.direccionCompleta.isNotEmpty
                                  ? visita.direccionCompleta
                                  : 'Sin dirección',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(color: AppColors.onSurfaceVariant),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        fecha,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.outline,
                            ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppColors.outline),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
