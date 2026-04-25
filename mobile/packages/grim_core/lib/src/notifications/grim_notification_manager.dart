import 'package:flutter/material.dart';

import 'widgets/grim_notification_dialog.dart';

class GrimNotificationManager {
  const GrimNotificationManager._();

  static Future<void> showCompactSwitchDialog(BuildContext context) {
    return showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (_) => const Center(
        child: Material(color: Colors.transparent, child: GrimNotificationDialog()),
      ),
    );
  }
}
