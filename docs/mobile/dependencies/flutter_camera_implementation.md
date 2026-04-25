# Flutter camera implementation

Implementation guide for adding a real camera flow to Grim's mobile client.

Key references:

- https://docs.flutter.dev/cookbook/plugins/picture-using-camera
- https://pub.dev/packages/camera
- https://pub.dev/packages/camera_android_camerax

Vendor docs reviewed: 2026-04-19.

## Current repo status

- `mobile/packages/grim_sender_camera/lib/src/grim_sender_camera_page.dart` is still a mock screen with a placeholder viewport.
- `mobile/pubspec.yaml` does not currently include `camera`, `path_provider`, or `path`.
- `mobile/ios/Runner/Info.plist` does not yet declare camera or microphone usage descriptions.
- `mobile/android/app/build.gradle.kts` inherits `flutter.minSdkVersion`; verify that value against the camera package version you pin before merging.

## Recommended package choice

Use Flutter's official `camera` plugin for the app-facing API.

- `camera` provides preview, still capture, video capture, and image stream access.
- On Android, `camera_android_camerax` is the endorsed implementation and is automatically included when you depend on `camera` on current releases.

If Grim only needs still-image capture, keep the first integration narrow:

- `camera`
- `path_provider` if you want to move or persist captures outside the plugin's returned temp file path
- `path` if you need portable path composition

## Install

From `mobile/`:

```bash
flutter pub add camera
flutter pub add path_provider path
```

If Grim keeps captured files only as the `XFile.path` returned by `takePicture()`, `path_provider` and `path` can wait until persistence requirements are clearer.

## Platform setup

### iOS

The official camera docs require camera and microphone usage strings in `mobile/ios/Runner/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Capture an image to import into GRIM.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Record audio when capturing video in GRIM.</string>
```

If Grim ships still photos only, keeping the microphone string in place is still the safer default because the plugin supports video capture too.

### Android

Two upstream docs currently matter:

- Flutter's camera cookbook still calls out `minSdkVersion` 21 or higher.
- The current `camera` package page on pub.dev lists Android support as SDK 24+.

For this repo, do not assume the scaffold default is sufficient. Check the resolved `minSdk` in `mobile/android/app/build.gradle.kts` after pinning the package version you actually use.

## Lifecycle handling

The `camera` package no longer manages lifecycle transitions for you. The app is expected to release the controller when the app becomes inactive and recreate it when the app resumes.

That matters for Grim because the sender camera view lives in its own package. Put lifecycle-aware controller management in the `grim_sender_camera` package instead of scattering camera calls across app-level widgets.

## Minimal repo-shaped implementation

Keep app bootstrapping in `mobile/lib/main.dart`, but put camera-specific state inside `mobile/packages/grim_sender_camera/`.

Example shape for the sender camera package:

```dart
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';

class GrimSenderCameraView extends StatefulWidget {
  const GrimSenderCameraView({super.key});

  @override
  State<GrimSenderCameraView> createState() => _GrimSenderCameraViewState();
}

class _GrimSenderCameraViewState extends State<GrimSenderCameraView>
    with WidgetsBindingObserver {
  CameraController? _controller;
  List<CameraDescription> _cameras = const [];
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initialize();
  }

  Future<void> _initialize() async {
    _cameras = await availableCameras();
    final camera = _cameras.first;

    final controller = CameraController(
      camera,
      ResolutionPreset.high,
      enableAudio: false,
    );

    await controller.initialize();

    if (!mounted) {
      await controller.dispose();
      return;
    }

    setState(() {
      _controller = controller;
      _ready = true;
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return;
    }

    if (state == AppLifecycleState.inactive) {
      controller.dispose();
      _controller = null;
      _ready = false;
    } else if (state == AppLifecycleState.resumed) {
      _initialize();
    }
  }

  Future<XFile?> capture() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return null;
    }

    return controller.takePicture();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready || _controller == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return CameraPreview(_controller!);
  }
}
```

## Error handling to implement

The current `camera` package documentation explicitly calls out permission-related exceptions that can be thrown during controller initialization, including:

- `CameraAccessDenied`
- `CameraAccessDeniedWithoutPrompt`
- `CameraAccessRestricted`
- `AudioAccessDenied`

Translate these into app-level UI states instead of letting initialization failures collapse into a blank screen.

## Grim-specific integration notes

- Keep camera controller ownership inside `grim_sender_camera`; other packages should receive captured file paths or typed domain objects, not raw `CameraController` references.
- If the next step is upload, prefer handing `XFile.path` into the network layer rather than storing binary image data in Riverpod state.
- If Grim later adds continuous image analysis, re-evaluate background streaming and Android-specific CameraX limits before enabling `startImageStream`.

## References

- Flutter camera cookbook: https://docs.flutter.dev/cookbook/plugins/picture-using-camera
- `camera` package: https://pub.dev/packages/camera
- `camera_android_camerax` package: https://pub.dev/packages/camera_android_camerax

---

**Updated:** 2026-04-19  
**Applies to:** grim mobile (`mobile/`, especially `mobile/packages/grim_sender_camera/`)  
**Doc version:** 1  
**Upstream refs:**  
- https://docs.flutter.dev/cookbook/plugins/picture-using-camera  
- https://pub.dev/packages/camera  
- https://pub.dev/packages/camera_android_camerax
