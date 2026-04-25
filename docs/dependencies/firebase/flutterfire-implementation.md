# FlutterFire CLI implementation (Flutter + Firebase)

This document summarizes how we use the **FlutterFire CLI** to register Flutter targets with a Firebase project and generate **`firebase_options.dart`**. Canonical, up-to-date steps live on Firebase’s site: **[Add Firebase to your Flutter app](https://firebase.google.com/docs/flutter/setup)**.

> **Note:** The older FlutterFire CLI page at [firebase.flutter.dev/docs/cli](https://firebase.flutter.dev/docs/cli) is archived; prefer the Firebase doc above for the latest workflow and cautions.

## Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install/) installed and on your `PATH`
- [Node.js](https://nodejs.org/) (for the Firebase CLI; v18+ per [Firebase CLI](https://firebase.google.com/docs/cli#install_the_firebase_cli))
- A Google account with access to [Firebase console](https://console.firebase.google.com/)

## 1. Install command-line tools

**Firebase CLI** (global npm package):

```bash
npm install -g firebase-tools
```

**Sign in:**

```bash
firebase login
```

**FlutterFire CLI** (Dart global activate):

```bash
dart pub global activate flutterfire_cli
```

Ensure Pub’s global `bin` directory is on your `PATH` so `flutterfire` resolves (Flutter docs describe this under [Add Firebase to your Flutter app](https://firebase.google.com/docs/flutter/setup)). Quick check:

```bash
flutterfire --version
```

Re-activate to upgrade:

```bash
dart pub global activate flutterfire_cli
```

## 2. Configure the Flutter app (`flutterfire configure`)

From your **Flutter project root** (where `pubspec.yaml` lives):

```bash
flutterfire configure
```

The wizard typically:

1. Lets you choose or create a Firebase project.
2. Asks which platforms (iOS, Android, Web, …) apply to this Flutter app.
3. Creates or matches **Firebase apps** per platform (bundle ID / package name / web app).
4. Writes **`lib/firebase_options.dart`** (default path) with non-secret project identifiers per platform.

Official overview of what this does: [Step 2: Configure your apps to use Firebase](https://firebase.google.com/docs/flutter/setup#step-2-configure-your-apps-to-use-firebase).

### Useful flags (non-interactive or CI-friendly)

| Flag | Short | Purpose |
|------|--------|---------|
| `--project` | `-p` | Firebase project ID |
| `--account` | `-e` | Google account email for Firebase CLI |
| `--out` | `-o` | Output path for generated Dart file (default `lib/firebase_options.dart`) |
| `--ios-bundle-id` | `-i` | iOS bundle ID |
| `--macos-bundle-id` | `-m` | macOS bundle ID |
| `--android-package-name` | `-a` | Android application ID |
| `--[no-]apply-gradle-plugin` | `-g` | Apply Firebase Gradle plugin / `google-services.json` wiring on Android (default on) |

Example:

```bash
flutterfire configure --project my-firebase-project-id --yes
```

Exact flags may evolve; run:

```bash
flutterfire configure --help
```

## 3. Add `firebase_core` and initialize in Dart

Per [Step 3: Initialize Firebase in your app](https://firebase.google.com/docs/flutter/setup#step-3-initialize-firebase-in-your-app):

```bash
flutter pub add firebase_core
```

Then in `lib/main.dart` (before `runApp`):

```dart
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

// In main():
WidgetsFlutterBinding.ensureInitialized();
await Firebase.initializeApp(
  options: DefaultFirebaseOptions.currentPlatform,
);
```

Rebuild:

```bash
flutter run
```

## 4. Add other Firebase plugins and re-run configure

Each product uses a [Flutter plugin](https://firebase.google.com/docs/flutter/setup#available-plugins) (e.g. `cloud_firestore`, `firebase_messaging`). After adding plugins with `flutter pub add`, run **`flutterfire configure` again** so configuration and (where applicable) Android Gradle plugins stay correct. Firebase explicitly recommends re-running when you add platforms or certain products (see the **CAUTION** callout on the [same setup page](https://firebase.google.com/docs/flutter/setup)).

Example:

```bash
flutter pub add cloud_firestore
flutterfire configure
flutter run
```

## 5. Optional: faster Firestore builds on iOS

Firestore’s native iOS build can be slow; Firebase documents using a precompiled iOS SDK via the Podfile. See [Cloud Firestore quickstart – Dart – Optional](https://firebase.google.com/docs/firestore/quickstart#dart) and match the **IOS_SDK_VERSION** to your `firebase_core` iOS SDK version.

## 6. Emulator / demo projects

For local emulator workflows or demo IDs, see [Add Firebase to your Flutter app](https://firebase.google.com/docs/flutter/setup) (demo `demoProjectId` and [Emulator Suite](https://firebase.google.com/docs/emulator-suite)).

## References

- [Add Firebase to your Flutter app](https://firebase.google.com/docs/flutter/setup) (primary)
- [Firebase CLI](https://firebase.google.com/docs/cli)
- [FlutterFire CLI (archived)](https://firebase.flutter.dev/docs/cli) — historical; prefer Firebase link above
- [FlutterFire CLI repository](https://github.com/invertase/flutterfire_cli) (issues and development)
- [Cloud Firestore Flutter quickstart](https://firebase.google.com/docs/firestore/quickstart#dart)
