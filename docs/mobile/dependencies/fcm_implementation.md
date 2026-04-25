# Firebase Cloud Messaging (FCM) implementation

Implementation guide for receiving Firebase Cloud Messaging events in Grim's Flutter app.

Key references:

- https://firebase.google.com/docs/cloud-messaging/flutter/get-started
- https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages
- https://firebase.google.com/docs/flutter/setup
- https://pub.dev/packages/firebase_messaging
- https://pub.dev/documentation/firebase_messaging/latest/firebase_messaging/FirebaseMessaging-class.html

Vendor docs checked online: 2026-04-19.

Firebase's FCM Flutter docs checked during this review were last updated 2026-04-17 UTC. `pub.dev` currently lists `firebase_messaging` 16.2.0 as the latest stable release, and `mobile/pubspec.lock` resolves `firebase_messaging` to 16.2.0.

## Current repo status

Implemented in this repo:

- `mobile/pubspec.yaml` includes `firebase_core`.
- `mobile/packages/grim_core/pubspec.yaml` owns `firebase_core`, `firebase_analytics`, `firebase_messaging`, and `flutter_riverpod` exports for feature packages; feature packages should keep using core rather than adding parallel Firebase/Riverpod dependencies.
- `mobile/packages/grim_core/pubspec.yaml` owns `flutter_local_notifications` for foreground Android notification display.
- `flutterfire configure` has generated `mobile/lib/firebase_options.dart`, `mobile/android/app/google-services.json`, `mobile/ios/Runner/GoogleService-Info.plist`, and `mobile/firebase.json`.
- `mobile/lib/main.dart` initializes Firebase with `DefaultFirebaseOptions.currentPlatform` and calls `GrimFcmManager().initialize()` before `runApp(...)`.
- `mobile/packages/grim_core/lib/src/fcm/grim_fcm_manager.dart` registers a top-level background handler, creates the Android channel `grim_results`, requests notification permission, sets Apple foreground presentation options, subscribes to topic `grim_new_result`, returns the FCM token, shows foreground Android local notifications from non-silent `onMessage` events, suppresses local notifications for `notificationType: silent`, and exposes `onMessage`, `onMessageOpenedApp`, `getInitialMessage()`, and `onTokenRefresh`.
- Android has the Google Services Gradle plugin applied, declares `android.permission.POST_NOTIFICATIONS`, and declares `grim_results` as Firebase Messaging's default notification channel.
- The backend sends high-priority Android topic messages through `FirebaseNotifier` on topic `grim_new_result` unless `GRIM_FCM_TOPIC` overrides it.
- `mobile/packages/grim_receiver_grid` can call `POST /api/v1/capture` from the receiver grid action.
- `mobile/packages/grim_sender_camera` listens for foreground `kind: capture_request` messages targeted to `sender`, takes a camera photo, and calls the import stream API.

Still missing or not verifiable from the repo:

- Apple push capabilities are not committed yet: no `aps-environment` entitlement, no `UIBackgroundModes` entry, and no checked-in evidence of Push Notifications plus Background fetch / Remote notifications being enabled in Xcode.
- The Firebase console APNs authentication key cannot be verified from source control.
- iOS Debug currently builds with bundle ID `com.lowjx.grim.mobile.dev`, while the committed Firebase iOS config is for `com.lowjx.grim.mobile`. Register/configure the debug app too, or align the debug bundle ID, before testing iOS push.
- The receiver grid does not yet bind silent `kind: export_refresh` to automatic invalidation of `grimReceiverExportPageProvider`; it currently supports pull-to-refresh / reload for `GET /api/v1/export`.
- The app shell does not yet bind `getInitialMessage()` or `onMessageOpenedApp` to a refresh or navigation action.
- The current manager does not wait for an APNs token before Apple FCM API calls such as topic subscription or `getToken()`. Firebase notes that the APNs token is not guaranteed to be available before FCM plugin calls.
- Some Android OEM builds can block background FCM delivery despite valid Firebase setup. On the attached Xiaomi/HyperOS test device, logcat showed `Greezer Denial` and `result=CANCELLED` for `com.google.android.c2dm.intent.RECEIVE`.

## Install and configuration

For a fresh setup in this repo, keep Firebase dependencies owned by the app shell and `grim_core`:

```bash
cd mobile/packages/grim_core
flutter pub add firebase_messaging

cd ../..
flutter pub get
flutterfire configure
```

Firebase's Flutter setup docs recommend re-running `flutterfire configure` when adding a Firebase product or a new platform so the generated app configuration stays current.

## Platform setup

### Apple platforms

Firebase's current FCM Flutter setup requires:

- enabling Push Notifications in Xcode
- enabling Background Modes, specifically Background fetch and Remote notifications
- uploading an APNs authentication key to the Firebase console
- keeping method swizzling enabled for the Flutter FCM plugin unless native token and notification forwarding is implemented manually

Before shipping on iOS, fix the bundle ID split between Debug and Release or provide a matching Firebase app/config file per build configuration. Firebase's Apple setup registers apps by bundle ID, and APNs delivery also depends on the signed app's push entitlement and APNs topic matching the installed app.

For Apple token work, add a platform-aware guard before `subscribeToTopic(...)` and `getToken()`:

```dart
final apnsToken = await FirebaseMessaging.instance.getAPNSToken();
if (apnsToken == null) {
  // Retry after APNs registration completes instead of treating FCM as broken.
  return;
}
```

Do not run that guard on Android.

### Android

Firebase's FCM Flutter docs require a device with Google Play services or an emulator image that includes Google APIs.

Android 13 and newer require runtime notification permission; `GrimFcmManager.initialize()` already calls `requestPermission(...)`, and the manifest already declares `POST_NOTIFICATIONS`.

If Android background notifications do not arrive, check logcat before changing Firebase config:

```bash
adb logcat -d -v time | rg 'Greezer|CANCELLED|UidFrozen|c2dm|FirebaseMessaging|com.lowjx.grim.mobile'
```

On Xiaomi/HyperOS or MIUI, `Greezer Denial` / `UidFrozen` means the device battery or autostart policy canceled the FCM broadcast. The practical device-side fix is to allow GRIM to autostart and set its battery policy to no restrictions. Server-side, Grim uses high-priority Android FCM messages, but OEM freezer policies can still override delivery.

### Web

The official FCM docs include VAPID-key and service-worker steps for Flutter web, but Grim does not currently have a `mobile/web/` target, so those steps are out of scope for this repo today.

## Startup shape for Grim

Keep app bootstrap in `mobile/lib/main.dart` and Firebase Messaging usage behind `grim_core`:

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await GrimFcmManager().initialize();
  runApp(const ProviderScope(child: MainApp()));
}
```

The background handler requirements from Firebase's receive-messages doc are satisfied by `grimFcmBackgroundHandler`:

- it is not anonymous
- it is a top-level function
- it is annotated with `@pragma('vm:entry-point')` for release-mode tree shaking

## Handling message states

The Firebase Flutter docs split handling by app state:

- Foreground: listen to `FirebaseMessaging.onMessage`.
- Background or terminated processing: register `FirebaseMessaging.onBackgroundMessage(...)`.
- Opened from background by tapping a notification: listen to `FirebaseMessaging.onMessageOpenedApp`.
- Opened from a terminated state by tapping a notification: await `FirebaseMessaging.instance.getInitialMessage()`.

Recommended app-level wiring:

```dart
Future<void> bindNotificationNavigation(GrimFcmManager fcm) async {
  fcm.onMessageOpenedApp.listen(handleMessage);

  final initialMessage = await fcm.getInitialMessage();
  if (initialMessage != null) {
    handleMessage(initialMessage);
  }
}
```

Keep `handleMessage(...)` app-specific and route through Grim's existing navigation or Riverpod state rather than making feature widgets listen to FCM directly.

## Foreground notification behavior

The current backend sends three Grim message kinds:

- `capture_request`: silent data-only message for sender devices.
- `new_result`: visible notification for receiver devices with data `kind: new_result`.
- `export_refresh`: silent data-only message for receiver devices with `url: /api/v1/export?page=1&limit=20`.

Firebase's receive-messages doc notes that notification messages arriving while the app is in the foreground do not show a visible notification by default. Grim handles this explicitly:

- Android: `GrimFcmManager` creates the `grim_results` channel and mirrors foreground non-silent `FirebaseMessaging.onMessage` events to `flutter_local_notifications`.
- Apple platforms: call `setForegroundNotificationPresentationOptions(...)`, which `GrimFcmManager.initialize()` already does.

Silent messages are identified by `notificationType: silent` or `notification_type: silent`; the manager does not show a local notification for them.

## Capture/import flow

The current implemented foreground flow is:

1. Receiver grid calls `POST /api/v1/capture`.
2. Backend sends silent `kind: capture_request`, `role: sender`.
3. Sender camera page receives the foreground FCM event, calls `takePicturePath()`, then uploads the photo through `GrimImportStreamClient.streamImportFile(...)`.
4. Backend import success sends receiver `new_result` and `export_refresh` signals.
5. Receiver reads canonical result rows through `GET /api/v1/export`.

Taking a photo requires the active sender camera controller. Background FCM handlers can initialize Firebase, but they do not currently open the camera or import an image.

## Topic and token strategy for this repo

The backend spec says the server broadcasts to topic `grim_new_result` by default and can override it with `GRIM_FCM_TOPIC`.

That means the mobile app should:

- subscribe to the same topic the backend is using
- centralize the topic string in one place
- treat token retrieval and token refresh as app-level concerns

The `FirebaseMessaging` API exposes:

- `getToken()` for the device FCM token
- `onTokenRefresh` for token rotation
- `getAPNSToken()` for Apple-platform troubleshooting
- `subscribeToTopic(...)` and `unsubscribeFromTopic(...)`

Keep FCM as a hint and refresh from `GET /api/v1/export`. Do not carry large result content in the push payload.

## Release checklist

- Android: test foreground and background notification display on a physical device or Google APIs emulator, grant notification permission on Android 13+, and verify a backend send reaches a subscribed app.
- Android OEMs: on Xiaomi/HyperOS or MIUI, also test after enabling app autostart and disabling battery restrictions for GRIM.
- iOS: test on a physical device, enable Push Notifications and Background Modes, upload the APNs key in Firebase, ensure the app's bundle ID matches the Firebase app config, and verify `getAPNSToken()` is non-null before FCM token/topic calls.
- App UX: wire receiver foreground `export_refresh`, notification-tap, and terminated-open handling to a single app event that refreshes export data.
- Backend contract: keep `grimDefaultFcmTopic` aligned with `DEFAULT_FCM_BROADCAST_TOPIC` or document any environment-specific override.

## References

- FCM Flutter get started: https://firebase.google.com/docs/cloud-messaging/flutter/get-started
- FCM Flutter receive messages: https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages
- Add Firebase to your Flutter app: https://firebase.google.com/docs/flutter/setup
- `firebase_messaging` package: https://pub.dev/packages/firebase_messaging
- `FirebaseMessaging` API: https://pub.dev/documentation/firebase_messaging/latest/firebase_messaging/FirebaseMessaging-class.html
- Existing backend FCM notes: `docs/dependencies/firebase/firebase-notification-implementation.md`

---

**Updated:** 2026-04-19
**Applies to:** grim mobile (`mobile/`) receiving FCM events from the current grim backend
**Doc version:** 3
**Upstream refs:**
- https://firebase.google.com/docs/cloud-messaging/flutter/get-started
- https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages
- https://firebase.google.com/docs/flutter/setup
- https://pub.dev/packages/firebase_messaging
- https://pub.dev/documentation/firebase_messaging/latest/firebase_messaging/FirebaseMessaging-class.html
