enum LlmProvider {
  openrouter('openrouter'),
  openai('openai'),
  nvidiaNim('nvidia_nim');

  const LlmProvider(this.value);
  final String value;

  static LlmProvider fromValue(String value) {
    return LlmProvider.values.firstWhere(
      (e) => e.value == value,
      orElse: () => throw ArgumentError('Unknown LlmProvider: $value'),
    );
  }
}
