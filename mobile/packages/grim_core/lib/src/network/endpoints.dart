import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';

abstract final class GrimEndpoints {
  static const String _legacyDebugOrigin = String.fromEnvironment('GRIM_API_BASE');
  static const String _debugDeviceOrigin = String.fromEnvironment('GRIM_DEBUG_DEVICE_ORIGIN');
  static const String _debugPhysicalDeviceOrigin = String.fromEnvironment(
    'GRIM_DEBUG_PHYSICAL_DEVICE_ORIGIN',
    defaultValue: 'http://192.168.68.57:3001',
  );
  static const String _releaseApiPrefix = String.fromEnvironment(
    'GRIM_RELEASE_API_PREFIX',
    defaultValue: 'https://lowjungxuan.dpdns.org/backend/api',
  );
  static const String _releaseHealthUrl = String.fromEnvironment(
    'GRIM_RELEASE_HEALTH_URL',
    defaultValue: 'https://lowjungxuan.dpdns.org/backend/api/v1/health',
  );

  static const String _androidEmulatorOrigin = 'http://10.0.2.2:3001';
  static const String _iosSimulatorOrigin = 'http://localhost:3001';

  static String? _resolvedDebugOrigin;

  static Future<void> initialize({DeviceInfoPlugin? deviceInfoPlugin}) async {
    if (kReleaseMode) {
      return;
    }

    if (_hasValue(_legacyDebugOrigin)) {
      _resolvedDebugOrigin = _trimTrailingSlash(_legacyDebugOrigin);
      return;
    }
    if (_hasValue(_debugDeviceOrigin)) {
      _resolvedDebugOrigin = _trimTrailingSlash(_debugDeviceOrigin);
      return;
    }

    final deviceInfo = deviceInfoPlugin ?? DeviceInfoPlugin();
    _resolvedDebugOrigin = await _detectDebugOrigin(deviceInfo);
  }

  static String get baseUrl {
    if (kReleaseMode) {
      return _releaseOrigin;
    }
    return _resolvedDebugOrigin ?? _debugPhysicalDeviceOrigin;
  }

  static String get apiPrefix {
    if (kReleaseMode) {
      return _trimTrailingSlash(_releaseApiPrefix);
    }
    return '$baseUrl/api';
  }

  static String get import => '$apiPrefix/v1/import';
  static String get capture => '$apiPrefix/v1/capture';
  static String get health {
    if (kReleaseMode) {
      return _trimTrailingSlash(_releaseHealthUrl);
    }
    return '$baseUrl/health';
  }

  static String export({int page = 1, int limit = 20}) {
    return '$apiPrefix/v1/export?page=$page&limit=$limit';
  }

  @visibleForTesting
  static String debugOriginFor({required TargetPlatform platform, required bool isPhysicalDevice}) {
    return switch (platform) {
      TargetPlatform.android => isPhysicalDevice ? _debugPhysicalDeviceOrigin : _androidEmulatorOrigin,
      TargetPlatform.iOS => isPhysicalDevice ? _debugPhysicalDeviceOrigin : _iosSimulatorOrigin,
      _ => _iosSimulatorOrigin,
    };
  }

  static Future<String> _detectDebugOrigin(DeviceInfoPlugin deviceInfo) async {
    try {
      return switch (defaultTargetPlatform) {
        TargetPlatform.android => debugOriginFor(
          platform: TargetPlatform.android,
          isPhysicalDevice: (await deviceInfo.androidInfo).isPhysicalDevice,
        ),
        TargetPlatform.iOS => debugOriginFor(
          platform: TargetPlatform.iOS,
          isPhysicalDevice: (await deviceInfo.iosInfo).isPhysicalDevice,
        ),
        _ => debugOriginFor(platform: defaultTargetPlatform, isPhysicalDevice: false),
      };
    } catch (_) {
      return _debugPhysicalDeviceOrigin;
    }
  }

  static String get _releaseOrigin {
    final uri = Uri.parse(_releaseApiPrefix);
    if (!uri.hasScheme || uri.host.isEmpty) {
      return _trimTrailingSlash(_releaseApiPrefix);
    }
    return _trimTrailingSlash(uri.replace(path: '', query: '', fragment: '').toString());
  }

  static bool _hasValue(String value) => value.trim().isNotEmpty;

  static String _trimTrailingSlash(String value) {
    return value.trim().replaceFirst(RegExp(r'/+$'), '');
  }
}
