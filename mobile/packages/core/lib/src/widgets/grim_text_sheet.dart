import 'package:flutter/material.dart';

import '../theme/grim_colors.dart';

class GrimTextSheet extends StatefulWidget {
  const GrimTextSheet({
    super.key,
    required this.text,
    this.error,
    this.minSize = 0.12,
    this.initialSize = 0.18,
    this.maxSize = 0.7,
  });

  final String text;
  final String? error;
  final double minSize;
  final double initialSize;
  final double maxSize;

  @override
  State<GrimTextSheet> createState() => _GrimTextSheetState();
}

class _GrimTextSheetState extends State<GrimTextSheet> {
  static const _decoration = BoxDecoration(
    color: Color(0xE6000000),
    borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
  );

  final _controller = DraggableScrollableController();
  var _expanded = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _toggle() async {
    final target = _expanded ? widget.minSize : widget.maxSize;
    setState(() => _expanded = !_expanded);
    await _controller.animateTo(target, duration: const Duration(milliseconds: 220), curve: Curves.easeOut);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DraggableScrollableSheet(
      controller: _controller,
      initialChildSize: widget.initialSize,
      minChildSize: widget.minSize,
      maxChildSize: widget.maxSize,
      builder: (context, scrollController) {
        return DecoratedBox(
          decoration: _decoration,
          child: Column(
            children: [
              const SizedBox(height: 10),
              Center(
                child: IconButton(
                  onPressed: _toggle,
                  icon: Icon(
                    _expanded ? Icons.expand_more : Icons.expand_less,
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
                  tooltip: _expanded ? 'Collapse' : 'Expand',
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  children: [
                    if (widget.error case final err?) ...[
                      Text(err, style: TextStyle(color: theme.colorScheme.error, height: 1.35)),
                      const SizedBox(height: 12),
                    ],
                    Text(widget.text, style: TextStyle(color: GrimColors.onSurface, height: 1.35)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
