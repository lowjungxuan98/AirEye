import 'package:core/core.dart';
import '../select_role_controller.dart';
import 'provider_section.dart';
import 'role_card.dart';

class ReadyBody extends StatelessWidget {
  const ReadyBody({
    super.key,
    required this.provider,
    required this.isUpdatingProvider,
    required this.controller,
  });

  final ProviderResponse provider;
  final bool isUpdatingProvider;
  final SelectRoleController controller;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Spacer(flex: 2),
          Text('GRIM', style: textTheme.headlineLarge),
          const SizedBox(height: 6),
          Text(
            'Select your role to continue.',
            style: textTheme.bodyMedium?.copyWith(color: GrimColors.sectionLabel),
          ),
          const SizedBox(height: 40),
          RoleCard(
            icon: Icons.photo_camera_outlined,
            title: 'Sender',
            onTap: () => controller.navigateToSender(context),
          ),
          const SizedBox(height: 12),
          RoleCard(
            icon: Icons.phone_android_outlined,
            title: 'Receiver',
            onTap: () => controller.navigateToReceiver(context),
          ),
          const Spacer(flex: 3),
          ProviderSection(
            provider: provider,
            isLoading: isUpdatingProvider,
            controller: controller,
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
