import 'package:flutter/material.dart';
import 'package:spapp/services/connectivity_service.dart';
import 'package:spapp/services/offline_queue_service.dart';
import 'package:spapp/theme/app_theme.dart';

/// Banner discreto que informa sobre conexión lenta, offline o envíos pendientes.
class ConnectivityBanner extends StatelessWidget {
  const ConnectivityBanner({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: ValueListenableBuilder<int>(
            valueListenable: OfflineQueueService.pendingCount,
            builder: (context, pending, _) {
              return ValueListenableBuilder<bool>(
                valueListenable: ConnectivityService.instance.isOnline,
                builder: (context, online, _) {
                  return ValueListenableBuilder<bool>(
                    valueListenable:
                        ConnectivityService.instance.isSlowConnection,
                    builder: (context, slow, _) {
                      final message = _message(
                        online: online,
                        slow: slow,
                        pending: pending,
                      );
                      if (message == null) return const SizedBox.shrink();

                      return Material(
                        elevation: 2,
                        color: online
                            ? AppColors.secondary.withValues(alpha: 0.95)
                            : AppColors.error.withValues(alpha: 0.95),
                        child: SafeArea(
                          bottom: false,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.md,
                              vertical: AppSpacing.sm,
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  online
                                      ? Icons.signal_wifi_bad_rounded
                                      : Icons.cloud_off_rounded,
                                  size: 18,
                                  color: AppColors.onPrimary,
                                ),
                                const SizedBox(width: AppSpacing.sm),
                                Expanded(
                                  child: Text(
                                    message,
                                    style: AppTypography.labelSm.copyWith(
                                      color: AppColors.onPrimary,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  String? _message({
    required bool online,
    required bool slow,
    required int pending,
  }) {
    if (!online) {
      if (pending > 0) {
        return 'Sin conexión. $pending solicitud${pending == 1 ? '' : 'es'} '
            'se enviará${pending == 1 ? '' : 'n'} al reconectar.';
      }
      return 'Sin conexión. Mostrando datos guardados en el dispositivo.';
    }
    if (pending > 0) {
      return 'Enviando $pending solicitud${pending == 1 ? '' : 'es'} '
          'pendiente${pending == 1 ? '' : 's'}…';
    }
    if (slow) {
      return 'Conexión lenta. La app sigue funcionando con datos guardados.';
    }
    return null;
  }
}
