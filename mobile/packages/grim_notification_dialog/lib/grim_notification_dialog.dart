import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';

export 'package:grim_core/grim_core.dart' show GrimNotificationDialog, GrimNotificationManager;

Future<void> showGrimNotificationDialog(BuildContext context) {
  return GrimNotificationManager.showCompactSwitchDialog(context);
}
