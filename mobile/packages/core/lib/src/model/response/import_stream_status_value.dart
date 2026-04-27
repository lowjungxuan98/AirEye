enum ImportStreamStatusValue {
  extractingText('extracting_text'),
  analyzingText('analyzing_text'),
  formatGuard('format_guard');

  const ImportStreamStatusValue(this.value);
  final String value;

  static ImportStreamStatusValue fromJson(String value) {
    for (final v in ImportStreamStatusValue.values) {
      if (v.value == value) return v;
    }
    throw StateError('Unknown ImportStreamStatusValue: $value');
  }
}
