# FlutterFire implementation

Implementation guide for wiring Firebase into AirEye's Flutter app.

Key references:

- https://firebase.google.com/docs/flutter/setup
- https://pub.dev/packages/firebase_core
- https://pub.dev/packages/flutterfire_cli

Vendor docs reviewed: 2026-04-19.

## Current repo status

- Firebase Flutter plugins are owned by `mobile/packages/core`.
- `mobile/lib/main.dart` initializes Firebase once before `runApp(...)`.
- `mobile/packages/core/lib/src/firebase/init.dart` builds `FirebaseOptions` from Dart defines instead of committing generated client config files.
- Crashlytics is initialized through `AirEyeCrashlyticsManager` and has collection enabled for debug, profile, and release builds.
- The repo currently has Android and iOS targets; there is no `mobile/web/` target to configure yet.

## What FlutterFire setup should own

Per Firebase's current Flutter setup docs, the FlutterFire CLI is the canonical way to:

- create or match Firebase apps for the selected Flutter platforms
- generate `lib/firebase_options.dart`
- keep Firebase configuration current as new platforms or Firebase products are added
- add required Android Gradle plugins for products such as Crashlytics or Performance Monitoring when applicable

For AirEye, keep this setup at the app root under `mobile/`, not inside an internal package such as `sender`.

## One-time tool install

```bash
npm install -g firebase-tools
firebase login
dart pub global activate flutterfire_cli
flutterfire --version
```

## Configure the app

Run the CLI from the Flutter app root:

```bash
cd mobile
flutterfire configure
```

This flow creates or matches Firebase apps for the platforms you select and writes `mobile/lib/firebase_options.dart`. That generated Dart file is ignored in this repo; keep the app on the env-based initializer unless you intentionally change the Firebase bootstrap.

Firebase's docs explicitly say to re-run `flutterfire configure` whenever you:

- add support for a new platform
- start using a new Firebase product

## Add the core plugin

```bash
cd mobile
flutter pub add firebase_core
flutterfire configure
```

In this repo, keep generated Firebase config files out of version control and provide Firebase values through Dart defines.

Crashlytics is also owned by core:

```bash
cd mobile
flutter pub add firebase_crashlytics
flutterfire configure
```

The Android Google Services and Crashlytics Gradle plugins are applied in `mobile/android/settings.gradle.kts` and `mobile/android/app/build.gradle.kts`. iOS includes the Crashlytics symbol upload build phase in `mobile/ios/Runner.xcodeproj/project.pbxproj`.

## Initialize in AirEye

Initialize Firebase once in `mobile/lib/main.dart` before `runApp(...)`.

Current shape for this repo:

```dart
import 'package:core/core.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeFirebase();
  await AirEyeCrashlyticsManager.init();
  runApp(AppScope(child: MaterialApp(theme: appTheme, home: const SplashScreen())));
}
```

Do not call `Firebase.initializeApp(...)` again from feature packages unless you are intentionally creating secondary Firebase apps.

## Repo-specific notes

### Client API keys

`mobile/packages/core/lib/src/firebase/init.dart` uses:

- `FIREBASE_ANDROID_API_KEY`
- `FIREBASE_IOS_API_KEY`

Local developers should create `mobile/.env.local` through `scripts/mobile_setup.sh` and run Flutter with:

```bash
flutter run --dart-define-from-file=.env.local
```

Do not commit generated FlutterFire config files such as `mobile/lib/firebase_options.dart`, `mobile/android/app/google-services.json`, or `mobile/ios/Runner/GoogleService-Info.plist`; recreate them locally or supply values through CI secrets. The native config files are still required by the Android Google Services plugin and the iOS Crashlytics dSYM upload phase, so local release builds should generate them with `flutterfire configure` or download them from Firebase Console. The mobile release workflows generate these ignored files from existing GitHub Actions Firebase secrets before building.

Firebase client API keys are not Firebase Admin credentials, but leaked keys should still be rotated or restricted in Google Cloud before resolving GitHub alerts. Keep Admin service account JSON, private keys, and FCM server keys out of the mobile app and in backend/server-side configuration only.

### Android debug suffix

`mobile/android/app/build.gradle.kts` uses the same application ID for debug and release builds today.

That matters because Firebase registration is tied to the actual Android application ID. If AirEye wants separate Firebase apps or projects for debug and release, register the matching IDs and re-run `flutterfire configure` after settling the variant strategy.

### Shared backend project

The backend already uses Firebase Admin, Realtime Database, and FCM under `docs/dependencies/firebase/`.

If the mobile app should talk to the same Firebase project:

- align Firebase project IDs across mobile and backend environments
- keep the mobile bootstrap in `mobile/lib/main.dart`
- keep backend service credentials server-side only; the Flutter app should never receive Admin credentials

## Adding more Firebase products later

After the base setup, the Firebase docs recommend the same pattern for every product:

```bash
cd mobile
flutter pub add PLUGIN_NAME
flutterfire configure
flutter run
```

Examples relevant to AirEye:

- `firebase_messaging` for push notifications
- `firebase_database` if the mobile client ever reads Realtime Database directly
- `firebase_crashlytics` for crash reporting

## References

- Add Firebase to your Flutter app: https://firebase.google.com/docs/flutter/setup
- `firebase_core` package: https://pub.dev/packages/firebase_core
- `firebase_crashlytics` package: https://pub.dev/packages/firebase_crashlytics
- `flutterfire_cli` package: https://pub.dev/packages/flutterfire_cli
- Existing repo Firebase notes: `docs/dependencies/firebase/`

---

**Updated:** 2026-05-24  
**Applies to:** AirEye mobile (`mobile/`, especially `mobile/lib/main.dart`)  
**Doc version:** 2  
**Upstream refs:**  
- https://firebase.google.com/docs/flutter/setup  
- https://pub.dev/packages/firebase_core  
- https://pub.dev/packages/firebase_crashlytics  
- https://pub.dev/packages/flutterfire_cli
