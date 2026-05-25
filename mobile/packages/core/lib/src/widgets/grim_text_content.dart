import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';

import '../theme/grim_colors.dart';

class GrimTextContent extends StatelessWidget {
  const GrimTextContent({super.key, required this.text, this.error, this.controller, this.padding = const EdgeInsets.fromLTRB(16, 0, 16, 24)});

  static const _blockedHtmlTags = {'script', 'style', 'iframe', 'object', 'embed'};

  final String text;
  final String? error;
  final ScrollController? controller;
  final EdgeInsetsGeometry padding;

  Map<String, Style> _htmlStyles(ThemeData theme) {
    return {
      '*': Style(color: GrimColors.onSurface, lineHeight: const LineHeight(1.35)),
      'html': Style(margin: Margins.zero, padding: HtmlPaddings.zero),
      'body': Style(margin: Margins.zero, padding: HtmlPaddings.zero),
      'p': Style(margin: Margins.only(bottom: 8)),
      'ul': Style(margin: Margins.only(bottom: 8), padding: HtmlPaddings.only(left: 18)),
      'ol': Style(margin: Margins.only(bottom: 8), padding: HtmlPaddings.only(left: 18)),
      'li': Style(margin: Margins.only(bottom: 4)),
      'a': Style(color: theme.colorScheme.primary),
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      controller: controller,
      padding: padding,
      children: [
        if (error case final err?) ...[Text(err, style: TextStyle(color: theme.colorScheme.error, height: 1.35)), const SizedBox(height: 12)],
        Html(data: text, shrinkWrap: true, doNotRenderTheseTags: _blockedHtmlTags, style: _htmlStyles(theme)),
      ],
    );
  }
}
