import 'package:core/core.dart';
import 'package:flutter/services.dart';
import 'package:splash/splash.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations(const [DeviceOrientation.portraitUp]);
  await initializeFirebase();

  // Must be registered before runApp.
  FirebaseMessaging.onBackgroundMessage(grimFirebaseMessagingBackgroundHandler);

  await GrimFcmManager.init();

  runApp(
    AppScope(
      child: MaterialApp(theme: GrimAppTheme.dark, themeMode: ThemeMode.dark, home: const SplashScreen()),
    ),
  );
}
