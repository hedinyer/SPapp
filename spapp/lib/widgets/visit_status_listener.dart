import 'package:flutter/material.dart';
import 'package:spapp/models/visita.dart';
import 'package:spapp/services/visit_assignment_watcher.dart';
import 'package:spapp/widgets/visit_assignment_status_card.dart';

/// Escucha cambios de estado en `visitas` vía Realtime y actualiza la tarjeta.
class VisitStatusListener extends StatefulWidget {
  const VisitStatusListener({
    super.key,
    required this.userId,
  });

  final int userId;

  @override
  State<VisitStatusListener> createState() => _VisitStatusListenerState();
}

class _VisitStatusListenerState extends State<VisitStatusListener> {
  Visita? _visita;
  bool _isLoading = true;
  VisitAssignmentWatcher? _watcher;

  @override
  void initState() {
    super.initState();
    _watcher = VisitAssignmentWatcher(
      userId: widget.userId,
      onChanged: _onVisitChanged,
    )..start();
  }

  @override
  void dispose() {
    _watcher?.dispose();
    super.dispose();
  }

  void _onVisitChanged(Visita? visit) {
    if (!mounted) return;
    setState(() {
      _visita = visit;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final cardKey = _isLoading
        ? 'loading'
        : _visita?.estado.dbValue ?? 'sin_visita';

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 350),
      switchInCurve: Curves.easeOut,
      switchOutCurve: Curves.easeIn,
      child: VisitAssignmentStatusCard(
        key: ValueKey(cardKey),
        visita: _visita,
        isLoading: _isLoading,
      ),
    );
  }
}
