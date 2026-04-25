import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';
import 'package:grim_receiver_grid/grim_receiver_grid.dart';
import 'package:grim_sender_camera/grim_sender_camera.dart';

import '../../application/grim_role_select_providers.dart';
import '../../application/grim_role_select_state.dart';
import '../widgets/grim_role_card.dart';

class GrimRoleSelectPage extends ConsumerWidget {
  const GrimRoleSelectPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: GrimColors.scaffold,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const GrimBrandLockup(),
              const SizedBox(height: 36),
              for (final o in grimRoleOptions) ...[
                GrimRoleCard(
                  title: o.title,
                  description: o.description,
                  selected: ref.watch(grimRoleSelectionProvider) == o.role,
                  onTap: () => ref.read(grimRoleSelectionProvider.notifier).setRole(o.role),
                ),
                if (o.role != grimRoleOptions.last.role) const SizedBox(height: 16),
              ],
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                  onPressed: () {
                    final role = ref.read(grimRoleSelectionProvider);
                    final page = switch (role) {
                      GrimRole.sender => const GrimSenderCameraPage(),
                      GrimRole.receiver => const GrimReceiverGridPage(),
                    };
                    Navigator.of(context).push<void>(MaterialPageRoute(builder: (_) => page));
                  },
                  child: const Text('CONTINUE'),
                ),
              ),
              const SizedBox(height: 16),
              const Center(
                child: Text('Choose role to proceed', style: TextStyle(color: GrimColors.muted, fontSize: 13)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
