abstract final class GrimEndpoints {
  /// Backend origin (no trailing slash). Defaults to localhost (simulators / desktop).
  ///
  /// On a **physical phone**, `localhost` is the phone itself — use your Mac’s LAN IP
  /// and pass it at compile time, e.g.:
  /// `flutter run --dart-define=GRIM_API_BASE=http://192.168.68.57:3001`
  ///
  /// **Android emulator → host:** `http://10.0.2.2:3001`
  static const String baseUrl = String.fromEnvironment('GRIM_API_BASE', defaultValue: 'http://192.168.68.57:3001');

  static String get import => '$baseUrl/api/v1/import';
  static String get capture => '$baseUrl/api/v1/capture';
  static String get health => '$baseUrl/health';

  static String export({int page = 1, int limit = 20}) {
    return '$baseUrl/api/v1/export?page=$page&limit=$limit';
  }
}
