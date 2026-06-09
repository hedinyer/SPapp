import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

enum MediaAccessType { camera, gallery }

class MediaPermissionService {
  static Future<bool> ensureAccess(
    MediaAccessType type, {
    required BuildContext context,
  }) async {
    final permission = await _permissionFor(type);
    var status = await permission.status;

    if (status.isGranted || status.isLimited) {
      return true;
    }

    if (status.isPermanentlyDenied || status.isRestricted) {
      if (!context.mounted) return false;
      await _showOpenSettingsDialog(context, type);
      return false;
    }

    status = await permission.request();

    if (status.isGranted || status.isLimited) {
      return true;
    }

    if (status.isPermanentlyDenied) {
      if (!context.mounted) return false;
      await _showOpenSettingsDialog(context, type);
      return false;
    }

    if (!context.mounted) return false;
    await _showDeniedDialog(context, type);
    return false;
  }

  static Future<Permission> _permissionFor(MediaAccessType type) async {
    if (type == MediaAccessType.camera) {
      return Permission.camera;
    }

    if (Platform.isAndroid) {
      final sdk = (await DeviceInfoPlugin().androidInfo).version.sdkInt;
      if (sdk >= 33) {
        return Permission.photos;
      }
      return Permission.storage;
    }

    return Permission.photos;
  }

  static Future<void> _showDeniedDialog(
    BuildContext context,
    MediaAccessType type,
  ) {
    final label = type == MediaAccessType.camera ? 'la cámara' : 'tus fotos';

    return showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Permiso necesario'),
        content: Text(
          'Para continuar necesitamos acceso a $label. '
          'Puedes otorgarlo cuando el sistema te lo solicite.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Entendido'),
          ),
        ],
      ),
    );
  }

  static Future<void> _showOpenSettingsDialog(
    BuildContext context,
    MediaAccessType type,
  ) {
    final label = type == MediaAccessType.camera ? 'Cámara' : 'Fotos';

    return showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Activa $label en Ajustes'),
        content: Text(
          'El permiso de $label está desactivado. '
          'Ábrelo en los ajustes del teléfono para tomar o elegir fotos.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              openAppSettings();
            },
            child: const Text('Abrir ajustes'),
          ),
        ],
      ),
    );
  }
}
