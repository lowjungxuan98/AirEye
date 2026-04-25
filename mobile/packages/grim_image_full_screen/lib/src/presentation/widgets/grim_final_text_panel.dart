import 'dart:convert';

import 'package:flutter/material.dart';

class GrimFinalTextPanel extends StatelessWidget {
  const GrimFinalTextPanel({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final displayText = _formatFinalText(text);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.62),
        border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.12))),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxHeight: 190),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
          child: Text(
            displayText,
            style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.38, fontWeight: FontWeight.w500),
          ),
        ),
      ),
    );
  }
}

String _formatFinalText(String text) {
  final trimmed = text.trim();
  if (trimmed.isEmpty) {
    return 'No final text available.';
  }

  try {
    final decoded = jsonDecode(trimmed);
    final normalized = decoded is List<Object?> ? <String, Object?>{'questions': decoded} : decoded;
    return const JsonEncoder.withIndent('  ').convert(normalized);
  } catch (_) {
    return trimmed;
  }
}
