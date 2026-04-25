import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

const grimDefaultFcmTopic = 'grim_new_result';
const grimFcmNotificationChannelId = 'grim_results';
const _grimFcmNotificationChannelName = 'GRIM results';
const _grimFcmNotificationChannelDescription = 'Notifications for newly available GRIM results.';

const _grimFcmAndroidChannel = AndroidNotificationChannel(
  grimFcmNotificationChannelId,
  _grimFcmNotificationChannelName,
  description: _grimFcmNotificationChannelDescription,
  importance: Importance.high,
);

Future<FirebaseApp> _ensureFirebaseInitialized() async {
  if (Firebase.apps.isNotEmpty) {
    return Firebase.app();
  }

  return Firebase.initializeApp();
}

@pragma('vm:entry-point')
Future<void> grimFcmBackgroundHandler(RemoteMessage message) async {
  await _ensureFirebaseInitialized();
}

class GrimFcmManager {
  GrimFcmManager({FirebaseMessaging? messaging, FlutterLocalNotificationsPlugin? localNotifications})
    : _messagingOverride = messaging,
      _localNotifications = localNotifications ?? FlutterLocalNotificationsPlugin();

  final FirebaseMessaging? _messagingOverride;
  final FlutterLocalNotificationsPlugin _localNotifications;
  StreamSubscription<RemoteMessage>? _foregroundMessageSubscription;

  FirebaseMessaging get _messaging => _messagingOverride ?? FirebaseMessaging.instance;

  Future<String?> initialize({String topic = grimDefaultFcmTopic, bool subscribeToTopic = true}) async {
    await _ensureFirebaseInitialized();
    FirebaseMessaging.onBackgroundMessage(grimFcmBackgroundHandler);

    await _initializeLocalNotifications();
    await _messaging.requestPermission(alert: true, badge: true, sound: true);

    await _messaging.setForegroundNotificationPresentationOptions(alert: true, badge: true, sound: true);
    _bindForegroundNotifications();

    if (subscribeToTopic) {
      await _messaging.subscribeToTopic(topic);
    }

    return _messaging.getToken();
  }

  Future<RemoteMessage?> getInitialMessage() {
    return _messaging.getInitialMessage();
  }

  Stream<RemoteMessage> get onMessage => FirebaseMessaging.onMessage;

  Stream<RemoteMessage> get onMessageOpenedApp => FirebaseMessaging.onMessageOpenedApp;

  Stream<String> get onTokenRefresh => _messaging.onTokenRefresh;

  Future<void> subscribeToTopic(String topic) {
    return _messaging.subscribeToTopic(topic);
  }

  Future<void> _initializeLocalNotifications() async {
    if (kIsWeb) {
      return;
    }

    await _localNotifications.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      ),
    );

    if (defaultTargetPlatform == TargetPlatform.android) {
      final androidNotifications = _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();

      await androidNotifications?.createNotificationChannel(_grimFcmAndroidChannel);
      await androidNotifications?.requestNotificationsPermission();
    }
  }

  void _bindForegroundNotifications() {
    if (defaultTargetPlatform != TargetPlatform.android || kIsWeb) {
      return;
    }

    _foregroundMessageSubscription ??= FirebaseMessaging.onMessage.listen(_showForegroundNotification);
  }

  Future<void> _showForegroundNotification(RemoteMessage message) async {
    if (_isSilentNotification(message)) {
      return;
    }

    final notification = message.notification;
    final title = notification?.title ?? message.data['title'] ?? 'GRIM';
    final body = notification?.body ?? message.data['body'] ?? 'New result is ready.';
    final payload = message.data.isEmpty ? null : jsonEncode(message.data);
    final notificationId = (message.messageId?.hashCode ?? DateTime.now().millisecondsSinceEpoch) & 0x7fffffff;

    await _localNotifications.show(
      id: notificationId,
      title: title,
      body: body,
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          grimFcmNotificationChannelId,
          _grimFcmNotificationChannelName,
          channelDescription: _grimFcmNotificationChannelDescription,
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
      payload: payload,
    );
  }

  bool _isSilentNotification(RemoteMessage message) {
    return message.data['notificationType'] == 'silent' || message.data['notification_type'] == 'silent';
  }
}
