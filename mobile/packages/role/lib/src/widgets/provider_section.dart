import 'package:core/core.dart';
import '../select_role_controller.dart';

class ProviderSection extends StatelessWidget {
  const ProviderSection({super.key, required this.provider, required this.autoAnalyseEnabled, required this.isLoadingProvider, required this.isLoadingAutoAnalyse, required this.controller});

  final ProviderResponse provider;
  final bool autoAnalyseEnabled;
  final bool isLoadingProvider;
  final bool isLoadingAutoAnalyse;
  final SelectRoleController controller;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('AI PROVIDER', style: textTheme.labelLarge?.copyWith(color: GrimColors.sectionLabel, fontSize: 10, letterSpacing: 1.2)),
        const SizedBox(height: 2),
        ProviderSelectorWidget(provider: provider, onSelect: controller.updateProvider, isLoading: isLoadingProvider),
        const SizedBox(height: 6),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isLoadingAutoAnalyse) ...[const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)), const SizedBox(width: 6)],
            Text('auto_analyse', style: textTheme.labelLarge?.copyWith(color: GrimColors.sectionLabel, fontSize: 12, fontWeight: FontWeight.w700)),
            const SizedBox(width: 8),
            Switch.adaptive(value: autoAnalyseEnabled, onChanged: isLoadingAutoAnalyse ? null : controller.updateAutoAnalyse, materialTapTargetSize: MaterialTapTargetSize.shrinkWrap),
          ],
        ),
      ],
    );
  }
}
