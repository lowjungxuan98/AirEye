# GRIM Mobile

Flutter mobile client for GRIM.

## First-time setup

From the repo root:

```bash
./scripts/mobile_setup.sh
```

The script:

- generates `mobile/android/app/upload-keystore.jks` when it does not exist
- writes local Android signing config to `mobile/android/key.properties`
- writes local Dart defines to `mobile/.env.local`
- uploads required GitHub Actions secrets with `gh secret set`

The generated files are ignored by git.

Run locally:

```bash
cd mobile
flutter pub get
flutter run --dart-define-from-file=.env.local
```

## API URLs

Debug/profile builds resolve the backend host at startup:

- Android emulator: `http://10.0.2.2:3001`
- iOS simulator: `http://localhost:3001`
- Physical iOS/Android device: `http://192.168.68.57:3001` by default

Override physical-device debug origin in `.env.local`:

```text
GRIM_DEBUG_PHYSICAL_DEVICE_ORIGIN=http://<your-mac-lan-ip>:3001
```

Release builds use:

- health: `https://lowjungxuan.dpdns.org/health`
- API v1: `https://lowjungxuan.dpdns.org/api/v1/*`

These can be overridden in CI or locally with `GRIM_RELEASE_HEALTH_URL` and `GRIM_RELEASE_API_PREFIX`.

## Firebase API keys

`lib/firebase_options.dart` reads client API keys from Dart defines:

- `FIREBASE_ANDROID_API_KEY`
- `FIREBASE_IOS_API_KEY`

Firebase client API keys identify the Firebase project; Firebase authorization still comes from Firebase Security Rules, App Check, IAM, and backend-owned credentials. Keep Firebase Admin service account keys and FCM server keys server-side only.

## Mobile releases

Push a tag like:

```bash
git tag mobile-v0.1.0
git push origin mobile-v0.1.0
```

`.github/workflows/mobile-release.yml` analyzes/tests the app, builds a signed release APK, and uploads it to the GitHub Release when mobile files changed since the previous `mobile-v*` tag.
