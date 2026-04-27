import 'dart:async';
import 'dart:developer' as dev;

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'init.dart';

const _tag = 'GrimFcm';

const _channel = AndroidNotificationChannel(
  'grim_results',
  'GRIM Results',
  description: 'Notifications for new GRIM results',
  importance: Importance.high,
);

final _localNotifications = FlutterLocalNotificationsPlugin();
final _foregroundMessages = StreamController<RemoteMessage>.broadcast();
final _openedAppMessages = StreamController<RemoteMessage>.broadcast();

typedef GrimFcmForegroundHandler = Future<void> Function(RemoteMessage message);
typedef GrimFcmOpenedAppHandler = Future<void> Function(RemoteMessage message);
typedef GrimFcmTokenHandler = Future<void> Function(String? token);

/// Must be called before [runApp] — registers the background isolate entry-point.
@pragma('vm:entry-point')
Future<void> grimFirebaseMessagingBackgroundHandler(
  RemoteMessage message,
) async {
  await initializeFirebase();
  dev.log('background message: ${message.messageId}', name: _tag);
}

class GrimFcmManager {
  GrimFcmManager._();

  static bool _initialized = false;

  static Stream<RemoteMessage> get foregroundMessages =>
      _foregroundMessages.stream;

  static Stream<RemoteMessage> get openedAppMessages =>
      _openedAppMessages.stream;

  /// Subscribes [handler] to foreground FCM messages for the lifetime of [ref].
  /// Pass [onDispose] for any extra cleanup (e.g. setting a disposed flag).
  static void subscribeForeground(
    Ref ref,
    Future<void> Function(RemoteMessage) handler, {
    void Function()? onDispose,
  }) {
    final subscription = foregroundMessages.listen(handler);
    ref.onDispose(() {
      subscription.cancel();
      onDispose?.call();
    });
  }

  static Future<void> init({
    GrimFcmForegroundHandler? onForegroundMessage,
    GrimFcmOpenedAppHandler? onMessageOpenedApp,
    GrimFcmTokenHandler? onToken,
    List<String> topics = const ['grim_new_result'],
  }) async {
    if (_initialized) return;
    _initialized = true;

    // Create Android notification channel.
    await _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(_channel);

    // Initialize local notifications plugin.
    await _localNotifications.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@drawable/ic_notification'),
      ),
    );

    final messaging = FirebaseMessaging.instance;

    final settings = await messaging.requestPermission();
    dev.log('permission: ${settings.authorizationStatus}', name: _tag);

    for (final topic in topics) {
      await messaging.subscribeToTopic(topic);
      dev.log('subscribed to topic: $topic', name: _tag);
    }

    final token = await messaging.getToken();
    dev.log('token: $token', name: _tag);
    if (onToken != null) await onToken(token);

    messaging.onTokenRefresh.listen((t) async {
      dev.log('token refreshed: $t', name: _tag);
      if (onToken != null) await onToken(t);
    });

    FirebaseMessaging.onMessage.listen((message) async {
      dev.log(
        'foreground message: ${message.messageId} data=${message.data}',
        name: _tag,
      );
      _foregroundMessages.add(message);
      _showForegroundNotification(message);
      if (onForegroundMessage != null) await onForegroundMessage(message);
    });

    FirebaseMessaging.onMessageOpenedApp.listen((message) async {
      dev.log('opened app via message: ${message.messageId}', name: _tag);
      _openedAppMessages.add(message);
      if (onMessageOpenedApp != null) await onMessageOpenedApp(message);
    });
  }

  static void _showForegroundNotification(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    _localNotifications.show(
      id: notification.hashCode,
      title: notification.title,
      body: notification.body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@drawable/ic_notification',
        ),
      ),
    );
  }

  /// Call after [init] to handle the "app opened from terminated state via tap" case.
  static Future<RemoteMessage?> getInitialMessage() {
    return FirebaseMessaging.instance.getInitialMessage();
  }
}
