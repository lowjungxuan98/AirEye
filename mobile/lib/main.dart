import 'package:core/core.dart';
import 'package:flutter/services.dart';
import 'package:splash/splash.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations(const [DeviceOrientation.portraitUp]);
  await WakelockPlus.enable();
  await initializeFirebase();
  await AirEyeCrashlyticsManager.init();

  // Must be registered before runApp.
  FirebaseMessaging.onBackgroundMessage(airEyeFirebaseMessagingBackgroundHandler);

  await AirEyeFcmManager.init();

  runApp(
    AppScope(
      child: MaterialApp(theme: GrimAppTheme.dark, themeMode: ThemeMode.dark, home: const SplashScreen()),
    ),
  );
}
