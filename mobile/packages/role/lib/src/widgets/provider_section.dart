import 'package:core/core.dart';
import '../select_role_controller.dart';

class ProviderSection extends StatelessWidget {
  const ProviderSection({
    super.key,
    required this.provider,
    required this.isLoading,
    required this.controller,
  });

  final ProviderResponse provider;
  final bool isLoading;
  final SelectRoleController controller;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'AI PROVIDER',
          style: textTheme.labelLarge?.copyWith(
            color: GrimColors.sectionLabel,
            fontSize: 10,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 2),
        ProviderSelectorWidget(
          provider: provider,
          onSelect: controller.updateProvider,
          isLoading: isLoading,
        ),
      ],
    );
  }
}
