import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';
import 'package:grim_splash/grim_splash.dart';

import 'firebase_options.dart';
import 'theme/grim_app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await GrimFcmManager().initialize();
  runApp(const ProviderScope(child: MainApp()));
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GRIM',
      theme: GrimAppTheme.dark,
      themeMode: ThemeMode.dark,
      builder: (context, child) {
        return MediaQuery.withClampedTextScaling(
          minScaleFactor: 0.85,
          maxScaleFactor: 1.1,
          child: child ?? const SizedBox.shrink(),
        );
      },
      home: const GrimSplashPage(),
    );
  }
}
