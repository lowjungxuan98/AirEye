import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart' show kReleaseMode;
import 'dart:io' show Platform;
import '../env.dart';

class GrimBaseUrl {
  static const _androidEmulatorBaseUrl = 'http://10.0.2.2:3001';
  static const _iosSimulatorBaseUrl = 'http://127.0.0.1:3001';

  static Future<String> resolve() async {
    final baseUrl = Env.apiBaseUrl.trim();
    final ip = Env.apiIpAddress.trim();

    if (kReleaseMode) {
      if (baseUrl.isEmpty) {
        throw StateError(
          'Missing GRIM_API_BASE_URL. In release builds you must pass '
          '--dart-define=GRIM_API_BASE_URL=http(s)://host:port/path',
        );
      }
      return baseUrl;
    }

    final deviceInfo = DeviceInfoPlugin();

    if (Platform.isAndroid) {
      final info = await deviceInfo.androidInfo;
      if (info.isPhysicalDevice) {
        if (ip.isEmpty) {
          throw StateError('Missing GRIM_API_IP_ADDRESS for debug physical device.');
        }
        return ip;
      }
      return _androidEmulatorBaseUrl;
    }

    if (Platform.isIOS) {
      final info = await deviceInfo.iosInfo;
      if (info.isPhysicalDevice) {
        if (ip.isEmpty) {
          throw StateError('Missing GRIM_API_IP_ADDRESS for debug physical device.');
        }
        return ip;
      }
      return _iosSimulatorBaseUrl;
    }

    throw StateError('Unsupported platform (only iOS/Android supported).');
  }
}
