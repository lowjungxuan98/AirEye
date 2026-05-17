import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';

class AppVersionLabel extends StatelessWidget {
  const AppVersionLabel({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return FutureBuilder<PackageInfo>(
      future: PackageInfo.fromPlatform(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const SizedBox.shrink();

        final info = snapshot.requireData;
        final buildNumber = info.buildNumber.trim();
        final version = buildNumber.isEmpty
            ? info.version
            : '${info.version}+$buildNumber';

        return Text(
          'v$version',
          textAlign: TextAlign.center,
          style: textTheme.labelMedium?.copyWith(
            color: colorScheme.onSurfaceVariant,
            letterSpacing: 0.4,
          ),
        );
      },
    );
  }
}
