class LlmProvider {
  const LlmProvider(this.value);

  final String value;

  static LlmProvider fromValue(String value) {
    final normalized = value.trim().toLowerCase();
    if (normalized.isEmpty) {
      throw ArgumentError('LlmProvider cannot be empty');
    }
    return LlmProvider(normalized);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LlmProvider && other.value == value;

  @override
  int get hashCode => value.hashCode;
}
