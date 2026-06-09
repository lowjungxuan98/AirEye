import 'package:core/core.dart';
import '../select_role_controller.dart';
import 'provider_section.dart';
import 'role_card.dart';

class ReadyBody extends StatelessWidget {
  const ReadyBody({super.key, required this.provider, required this.autoAnalyseEnabled, required this.isUpdatingProvider, required this.isUpdatingAutoAnalyse, required this.controller});

  final ProviderResponse provider;
  final bool autoAnalyseEnabled;
  final bool isUpdatingProvider;
  final bool isUpdatingAutoAnalyse;
  final SelectRoleController controller;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: IntrinsicHeight(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('AirEye', style: textTheme.headlineLarge),
                              const SizedBox(height: 6),
                              Text('Select your role to continue.', style: textTheme.bodyMedium?.copyWith(color: GrimColors.sectionLabel)),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        ProviderSection(provider: provider, autoAnalyseEnabled: autoAnalyseEnabled, isLoadingProvider: isUpdatingProvider, isLoadingAutoAnalyse: isUpdatingAutoAnalyse, controller: controller),
                      ],
                    ),
                    const SizedBox(height: 40),
                    RoleCard(icon: Icons.photo_camera_outlined, title: 'Sender', onTap: () => controller.navigateToSender(context)),
                    const SizedBox(height: 12),
                    RoleCard(icon: Icons.phone_android_outlined, title: 'Receiver', onTap: () => controller.navigateToReceiver(context)),
                    const Spacer(),
                    const SizedBox(height: 24),
                    const Center(child: AppVersionLabel()),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
