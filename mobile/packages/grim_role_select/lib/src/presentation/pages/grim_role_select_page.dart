import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';
import 'package:grim_receiver_grid/grim_receiver_grid.dart';
import 'package:grim_sender_camera/grim_sender_camera.dart';

import '../../application/grim_role_select_providers.dart';
import '../../application/grim_role_select_state.dart';
import '../widgets/grim_role_card.dart';

class GrimRoleSelectPage extends ConsumerWidget {
  const GrimRoleSelectPage({super.key});

  static const double _landscapeBreakpoint = 640;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedRole = ref.watch(grimRoleSelectionProvider);

    void setRole(GrimRole role) {
      ref.read(grimRoleSelectionProvider.notifier).setRole(role);
    }

    void continueWithRole() {
      final role = ref.read(grimRoleSelectionProvider);
      final page = switch (role) {
        GrimRole.sender => const GrimSenderCameraPage(),
        GrimRole.receiver => const GrimReceiverGridPage(),
      };
      Navigator.of(context).push<void>(MaterialPageRoute(builder: (_) => page));
    }

    return Scaffold(
      backgroundColor: GrimColors.scaffold,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final horizontal =
                constraints.maxWidth >= _landscapeBreakpoint && constraints.maxWidth > constraints.maxHeight;
            return Padding(
              padding: EdgeInsets.symmetric(horizontal: horizontal ? 32 : 24, vertical: 20),
              child: horizontal
                  ? _HorizontalRoleSelectLayout(
                      selectedRole: selectedRole,
                      onRoleSelected: setRole,
                      onContinue: continueWithRole,
                    )
                  : _VerticalRoleSelectLayout(
                      selectedRole: selectedRole,
                      onRoleSelected: setRole,
                      onContinue: continueWithRole,
                    ),
            );
          },
        ),
      ),
    );
  }
}

class _VerticalRoleSelectLayout extends StatelessWidget {
  const _VerticalRoleSelectLayout({required this.selectedRole, required this.onRoleSelected, required this.onContinue});

  final GrimRole selectedRole;
  final ValueChanged<GrimRole> onRoleSelected;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const GrimBrandLockup(),
        const SizedBox(height: 36),
        _RoleCardsColumn(selectedRole: selectedRole, onRoleSelected: onRoleSelected),
        const Spacer(),
        _ContinueButton(onPressed: onContinue),
        const SizedBox(height: 16),
        const _RoleSelectFooter(),
      ],
    );
  }
}

class _HorizontalRoleSelectLayout extends StatelessWidget {
  const _HorizontalRoleSelectLayout({
    required this.selectedRole,
    required this.onRoleSelected,
    required this.onContinue,
  });

  final GrimRole selectedRole;
  final ValueChanged<GrimRole> onRoleSelected;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(
          width: 256,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [GrimBrandLockup(titleSize: 34), Spacer(), _RoleSelectFooter()],
          ),
        ),
        const SizedBox(width: 24),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _RoleCardsRow(selectedRole: selectedRole, onRoleSelected: onRoleSelected),
              ),
              const SizedBox(height: 16),
              _ContinueButton(onPressed: onContinue),
            ],
          ),
        ),
      ],
    );
  }
}

class _RoleCardsColumn extends StatelessWidget {
  const _RoleCardsColumn({required this.selectedRole, required this.onRoleSelected});

  final GrimRole selectedRole;
  final ValueChanged<GrimRole> onRoleSelected;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < grimRoleOptions.length; i++) ...[
          GrimRoleCard(
            title: grimRoleOptions[i].title,
            description: grimRoleOptions[i].description,
            selected: selectedRole == grimRoleOptions[i].role,
            onTap: () => onRoleSelected(grimRoleOptions[i].role),
          ),
          if (i != grimRoleOptions.length - 1) const SizedBox(height: 16),
        ],
      ],
    );
  }
}

class _RoleCardsRow extends StatelessWidget {
  const _RoleCardsRow({required this.selectedRole, required this.onRoleSelected});

  final GrimRole selectedRole;
  final ValueChanged<GrimRole> onRoleSelected;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < grimRoleOptions.length; i++) ...[
          Expanded(
            child: GrimRoleCard(
              title: grimRoleOptions[i].title,
              description: grimRoleOptions[i].description,
              selected: selectedRole == grimRoleOptions[i].role,
              onTap: () => onRoleSelected(grimRoleOptions[i].role),
            ),
          ),
          if (i != grimRoleOptions.length - 1) const SizedBox(width: 16),
        ],
      ],
    );
  }
}

class _ContinueButton extends StatelessWidget {
  const _ContinueButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
        onPressed: onPressed,
        child: const Text('CONTINUE'),
      ),
    );
  }
}

class _RoleSelectFooter extends StatelessWidget {
  const _RoleSelectFooter();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text('Choose role to proceed', style: TextStyle(color: GrimColors.muted, fontSize: 13)),
    );
  }
}
