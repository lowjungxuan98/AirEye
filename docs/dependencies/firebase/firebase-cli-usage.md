# Firebase CLI usage

Quick reference for installing the [Firebase CLI](https://firebase.google.com/docs/cli), signing in, creating projects, wiring a local directory to Firebase, and common configuration commands. Node.js **v18+** is required for the npm-installed CLI.

## Install and update

```bash
npm install -g firebase-tools
```

Other install options (install script, standalone binary) are described in the official [install the Firebase CLI](https://firebase.google.com/docs/cli#install_the_firebase_cli) section.

Update after an npm install:

```bash
npm install -g firebase-tools
```

Check the CLI:

```bash
firebase --version
```

## Sign in and accounts

Interactive login (opens a browser; uses `localhost` unless you pass `--no-localhost`):

```bash
firebase login
```

Remote or headless machine without access to local redirect:

```bash
firebase login --no-localhost
```

Additional accounts and switching the active Google account:

```bash
firebase login:add
firebase login:list
firebase login:use EMAIL
firebase logout
```

**CI / automation:** Prefer [Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc) when possible. Legacy token flow: `firebase login:ci`, then use `FIREBASE_TOKEN` or `--token` (see [Use the Firebase CLI with CI systems](https://firebase.google.com/docs/cli#cli_ci_systems)).

Verify access:

```bash
firebase projects:list
```

## Create a Firebase project

Creates a Google Cloud project and attaches Firebase to it:

```bash
firebase projects:create PROJECT_ID --display-name "My app"
```

Use a globally unique `PROJECT_ID` (often lowercase, numbers, hyphens). Optional flags include `--organization` and `--folder` for GCP resource hierarchy (see `firebase projects:create --help`).

If you already have a **GCP project** without Firebase:

```bash
firebase projects:addfirebase --project EXISTING_GCP_PROJECT_ID
```

## Select the active project (CLI)

From a directory that has been initialized (see below), set which Firebase project commands target:

```bash
firebase use PROJECT_ID
firebase use --add   # define aliases in .firebaserc
```

Without a `firebase.json` / `.firebaserc`, you can still pass `--project PROJECT_ID` on many commands.

## Initialize a local “Firebase project directory”

`firebase init` does **not** create a new Firebase cloud project. It creates **`firebase.json`** and **`.firebaserc`** in the current folder and links that folder to a Firebase project you pick (or create during some flows).

```bash
cd your-repo-or-app
firebase init
```

You choose products (Hosting, Functions, Firestore rules, Realtime Database, emulators, etc.). You can run `firebase init` again later to add more products; re-running may reset that product’s section of `firebase.json` to defaults—see the official note in [Initialize a Firebase project](https://firebase.google.com/docs/cli#initialize_a_firebase_project).

Product-specific init shortcuts exist, for example:

```bash
firebase init hosting
firebase init functions
firebase init firestore
firebase init database
```

## Register apps and fetch native config (optional CLI path)

List apps in the current project:

```bash
firebase apps:list
```

Create a platform app (typical flags; run `firebase apps:create --help` for current options):

```bash
firebase apps:create ios     DISPLAY_NAME --bundle-id com.example.app
firebase apps:create android DISPLAY_NAME --package-name com.example.app
firebase apps:create web     DISPLAY_NAME
```

Print SDK config (e.g. for scripting):

```bash
firebase apps:sdkconfig ios APP_ID
firebase apps:sdkconfig android APP_ID
firebase apps:sdkconfig web APP_ID
```

For Flutter, prefer **FlutterFire CLI** (`flutterfire configure`) so `google-services.json`, `GoogleService-Info.plist`, and `firebase_options.dart` stay aligned—see [flutterfire-implementation.md](./flutterfire-implementation.md).

## “Enabling” services: CLI vs console

Many products are turned on or fully configured in the **[Firebase console](https://console.firebase.google.com/)** (Authentication providers, FCM/APNs setup, Analytics linking, etc.). The CLI is strongest for **project directory** setup, **deploy**, and **some** resource creation.

Examples where the CLI is commonly used:

| Goal | Typical approach |
|------|------------------|
| **Firestore** (native mode DB) | Console or `firebase firestore:databases:create` with `--location` (see `firebase firestore:locations`) |
| **Realtime Database instance** | `firebase init database`, or `firebase database:instances:create` with `--location` ([RTDB locations](https://firebase.google.com/docs/projects/locations#rtdb-locations)) |
| **Hosting / Functions** | `firebase init` + `firebase deploy` |
| **Security rules** | Local rules files from `firebase init`, then `firebase deploy --only firestore:rules` (etc.) |

For command-level detail, use:

```bash
firebase help
firebase COMMAND --help
```

Full tables: [Firebase CLI reference](https://firebase.google.com/docs/cli#command_reference).

## Open the console from the terminal

```bash
firebase open
```

## Further reading

- [Firebase CLI documentation](https://firebase.google.com/docs/cli)
- [Add Firebase to your Flutter app](https://firebase.google.com/docs/flutter/setup) (includes Firebase CLI + FlutterFire CLI steps)
