import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';

class GrimRoleCard extends StatelessWidget {
  const GrimRoleCard({
    super.key,
    required this.title,
    required this.description,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String description;
  final bool selected;
  final VoidCallback onTap;

  static const double _radius = 14;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(_radius),
        child: Ink(
          width: double.infinity,
          decoration: BoxDecoration(
            color: GrimColors.surfaceAlt,
            borderRadius: BorderRadius.circular(_radius),
            border: Border.all(color: selected ? GrimColors.accent : GrimColors.outline, width: 1.5),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: selected ? GrimColors.accent : GrimColors.onSurface,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 8),
                Text(description, style: const TextStyle(color: GrimColors.sectionLabel, fontSize: 14, height: 1.3)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
