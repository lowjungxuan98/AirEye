import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';

import '../../application/grim_sender_capture_flow_controller.dart';

class GrimSenderCaptureStatus extends StatelessWidget {
  const GrimSenderCaptureStatus({super.key, required this.state});

  final GrimSenderCaptureFlowState state;

  @override
  Widget build(BuildContext context) {
    if (state.phase == GrimSenderCapturePhase.idle) {
      return const SizedBox.shrink();
    }

    final isBusy = state.phase == GrimSenderCapturePhase.capturing || state.phase == GrimSenderCapturePhase.importing;
    final isError = state.phase == GrimSenderCapturePhase.failed;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.74),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: isError ? Colors.redAccent : GrimColors.outline),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            if (isBusy)
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2, color: GrimColors.accent),
              )
            else
              Icon(
                isError ? Icons.error_outline : Icons.check_circle_outline,
                size: 20,
                color: isError ? Colors.redAccent : GrimColors.accent,
              ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                state.message ??
                    switch (state.phase) {
                      GrimSenderCapturePhase.idle => '',
                      GrimSenderCapturePhase.capturing => 'Capturing',
                      GrimSenderCapturePhase.importing => 'Uploading',
                      GrimSenderCapturePhase.completed => 'Uploaded',
                      GrimSenderCapturePhase.failed => 'Capture failed',
                    },
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.25),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
