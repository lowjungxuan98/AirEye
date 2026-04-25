import 'package:flutter/material.dart';
import 'package:grim_core/grim_core.dart';
import 'package:grim_splash/grim_splash.dart';

import 'firebase_options.dart';
import 'theme/grim_app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await GrimEndpoints.initialize();
  debugPrint('GRIM API prefix: ${GrimEndpoints.apiPrefix}');
  debugPrint('GRIM health URL: ${GrimEndpoints.health}');
  await _initializeFirebase();
  runApp(const ProviderScope(child: MainApp()));
  WidgetsBinding.instance.addPostFrameCallback((_) {
    _initializeFcm();
  });
}

Future<void> _initializeFirebase() async {
  if (Firebase.apps.isNotEmpty) {
    return;
  }

  try {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  } on FirebaseException catch (error) {
    if (error.code == 'duplicate-app') {
      return;
    }
    rethrow;
  }
}

Future<void> _initializeFcm() async {
  try {
    await GrimFcmManager().initialize();
  } catch (error, stackTrace) {
    debugPrint('FCM initialization skipped: $error');
    debugPrintStack(stackTrace: stackTrace);
  }
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
