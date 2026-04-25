# FlutterFire implementation

Implementation guide for wiring Firebase into Grim's Flutter app.

Key references:

- https://firebase.google.com/docs/flutter/setup
- https://pub.dev/packages/firebase_core
- https://pub.dev/packages/flutterfire_cli

Vendor docs reviewed: 2026-04-19.

## Current repo status

- `mobile/pubspec.yaml` does not yet include `firebase_core` or any other Firebase Flutter plugin.
- `mobile/lib/main.dart` currently does not call `WidgetsFlutterBinding.ensureInitialized()` or `Firebase.initializeApp(...)`.
- `mobile/lib/firebase_options.dart` does not exist yet.
- The repo currently has Android and iOS targets; there is no `mobile/web/` target to configure yet.

## What FlutterFire setup should own

Per Firebase's current Flutter setup docs, the FlutterFire CLI is the canonical way to:

- create or match Firebase apps for the selected Flutter platforms
- generate `lib/firebase_options.dart`
- keep Firebase configuration current as new platforms or Firebase products are added
- add required Android Gradle plugins for products such as Crashlytics or Performance Monitoring when applicable

For Grim, keep this setup at the app root under `mobile/`, not inside an internal package such as `grim_sender_camera`.

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

This flow creates or matches Firebase apps for the platforms you select and writes `mobile/lib/firebase_options.dart`.

Firebase's docs explicitly say to re-run `flutterfire configure` whenever you:

- add support for a new platform
- start using a new Firebase product

## Add the core plugin

```bash
cd mobile
flutter pub add firebase_core
flutterfire configure
```

`firebase_options.dart` contains project identifiers, not secrets, so it is normally committed with the app code.

## Initialize in Grim

Initialize Firebase once in `mobile/lib/main.dart` before `runApp(...)`.

Recommended shape for this repo:

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/grim_core_page.dart';
import 'firebase_options.dart';
import 'theme/grim_app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  runApp(
    const ProviderScope(
      child: MainApp(),
    ),
  );
}
```

Do not call `Firebase.initializeApp(...)` again from feature packages unless you are intentionally creating secondary Firebase apps.

## Repo-specific notes

### Android debug suffix

`mobile/android/app/build.gradle.kts` currently adds `applicationIdSuffix = ".dev"` for debug builds.

That matters because Firebase registration is tied to the actual Android application ID. If Grim wants separate Firebase apps or projects for debug and release, register the matching IDs and re-run `flutterfire configure` after settling the variant strategy.

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

Examples relevant to Grim:

- `firebase_messaging` for push notifications
- `firebase_database` if the mobile client ever reads Realtime Database directly
- `firebase_crashlytics` if crash reporting is added

## References

- Add Firebase to your Flutter app: https://firebase.google.com/docs/flutter/setup
- `firebase_core` package: https://pub.dev/packages/firebase_core
- `flutterfire_cli` package: https://pub.dev/packages/flutterfire_cli
- Existing repo Firebase notes: `docs/dependencies/firebase/`

---

**Updated:** 2026-04-19  
**Applies to:** grim mobile (`mobile/`, especially `mobile/lib/main.dart`)  
**Doc version:** 1  
**Upstream refs:**  
- https://firebase.google.com/docs/flutter/setup  
- https://pub.dev/packages/firebase_core  
- https://pub.dev/packages/flutterfire_cli
