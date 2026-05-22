/// Central place for compile-time env configuration.
///
/// Values are provided via `--dart-define=KEY=value`.
abstract final class Env {
  // API
  static const apiBaseUrl = String.fromEnvironment('GRIM_API_BASE_URL');
  static const apiIpAddress = String.fromEnvironment('GRIM_API_IP_ADDRESS');

  // Firebase (shared)
  static const firebaseProjectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const firebaseMessagingSenderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const firebaseDatabaseUrl = String.fromEnvironment('FIREBASE_DATABASE_URL');
  static const firebaseStorageBucket = String.fromEnvironment('FIREBASE_STORAGE_BUCKET');

  // Firebase (Android)
  static const firebaseAndroidApiKey = String.fromEnvironment('FIREBASE_ANDROID_API_KEY');
  static const firebaseAndroidAppId = String.fromEnvironment('FIREBASE_ANDROID_APP_ID');

  // Firebase (iOS)
  static const firebaseIosApiKey = String.fromEnvironment('FIREBASE_IOS_API_KEY');
  static const firebaseIosAppId = String.fromEnvironment('FIREBASE_IOS_APP_ID');
  static const firebaseIosBundleId = String.fromEnvironment('FIREBASE_IOS_BUNDLE_ID');
}
