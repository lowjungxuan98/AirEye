import 'package:core/core.dart';

class ProviderSelectorWidget extends StatelessWidget {
  const ProviderSelectorWidget({
    super.key,
    required this.provider,
    required this.onSelect,
    this.isLoading = false,
  });

  final ProviderResponse provider;
  final void Function(LlmProvider) onSelect;
  final bool isLoading;

  String _label(LlmProvider p) => switch (p) {
    LlmProvider.openrouter => 'OpenRouter',
    LlmProvider.openai => 'OpenAI',
    LlmProvider.nvidiaNim => 'NVIDIA NIM',
  };

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final labelStyle = textTheme.labelLarge?.copyWith(
      fontSize: 12.5,
      fontWeight: FontWeight.w700,
      letterSpacing: 0.4,
    );

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        DropdownButton<LlmProvider>(
          value: provider.currentProvider,
          underline: const SizedBox(),
          dropdownColor: colorScheme.surfaceContainerHigh,
          iconEnabledColor: colorScheme.onSurface,
          iconDisabledColor: colorScheme.onSurface.withValues(alpha: 0.38),
          onChanged: isLoading ? null : (p) {
            if (p != null) onSelect(p);
          },
          selectedItemBuilder: (_) => provider.availableProviders.map((p) {
            return Align(
              alignment: Alignment.centerLeft,
              child: Text(
                _label(p),
                style: labelStyle?.copyWith(color: colorScheme.primary),
              ),
            );
          }).toList(),
          items: provider.availableProviders.map((p) {
            final isSelected = p == provider.currentProvider;
            return DropdownMenuItem<LlmProvider>(
              value: p,
              child: Text(
                _label(p),
                style: labelStyle?.copyWith(
                  color: isSelected ? colorScheme.primary : colorScheme.onSurface,
                ),
              ),
            );
          }).toList(),
        ),
        if (isLoading) ...[
          const SizedBox(width: 8),
          const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ],
      ],
    );
  }
}
