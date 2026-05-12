import 'package:core/core.dart';
import 'package:flutter/services.dart';

class ServerFormField extends StatelessWidget {
  const ServerFormField({
    super.key,
    required this.controller,
    required this.label,
    this.hint,
    this.keyboardType,
    this.inputFormatters,
    this.maxLines = 1,
    this.obscureText = false,
    this.validator,
  });

  final TextEditingController controller;
  final String label;
  final String? hint;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final int maxLines;
  final bool obscureText;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      style: const TextStyle(color: GrimColors.onSurface),
      cursorColor: GrimColors.accent,
      decoration: InputDecoration(labelText: label, hintText: hint),
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      maxLines: maxLines,
      obscureText: obscureText,
      validator: validator,
    );
  }
}
