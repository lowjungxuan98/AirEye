# Dio implementation

Implementation guide for adding a shared HTTP client to Grim's Flutter app.

Key references:

- https://pub.dev/packages/dio
- https://pub.dev/documentation/dio/latest/dio/Dio-class.html
- https://pub.dev/documentation/dio/latest/dio/LogInterceptor-class.html

Vendor docs reviewed: 2026-04-19.

## Current repo status

- `mobile/packages/grim_core` owns the shared Dio client and endpoint helpers.
- Feature packages consume `GrimDioClient` / `GrimEndpoints` from `grim_core`; they should not create a second HTTP stack.
- Grim's backend API contract exists in `backend/openapi.yaml` and `docs/specification.md`.

## Why use Dio here

The current Dio docs describe it as a full-featured HTTP client for Dart and Flutter with:

- global configuration via `BaseOptions`
- per-request overrides via `Options`
- interceptors
- request cancellation
- multipart upload support
- download/upload progress callbacks

That makes it a good fit for Grim's likely mobile flows:

- upload a captured image to `POST /api/v1/import`
- read paginated export data from `GET /api/v1/export`
- cancel screen-bound requests when a user backs out of a flow

## Install

From `mobile/`:

```bash
flutter pub add dio
```

## Recommended structure for Grim

Keep shared HTTP concerns in `mobile/packages/grim_core`.

Reason:

- base URL, timeouts, headers, auth, and logging are cross-cutting client concerns
- internal packages such as `grim_sender_camera` should depend on repositories or core services, not construct their own HTTP stack

## Baseline client setup

The Dio API docs recommend using a singleton-style shared instance for consistent base URLs, headers, and timeouts.

Example shape:

```dart
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class GrimApiClient {
  GrimApiClient(String baseUrl)
      : dio = Dio(
          BaseOptions(
            baseUrl: baseUrl,
            connectTimeout: const Duration(seconds: 5),
            receiveTimeout: const Duration(seconds: 30),
            sendTimeout: const Duration(seconds: 30),
            headers: const {
              'Accept': 'application/json',
            },
          ),
        ) {
    dio.interceptors.add(
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        logPrint: (o) => debugPrint(o.toString()),
      ),
    );
  }

  final Dio dio;
}
```

The upstream `LogInterceptor` docs explicitly note that it should be the last interceptor added so later interceptor mutations are included in the log output.

## Error handling

Catch `DioException` instead of treating all failures as generic exceptions.

The Dio docs distinguish between:

- failures with an HTTP response attached
- failures where the request never reached the server or otherwise failed before a response existed

Typical pattern:

```dart
try {
  final response = await dio.get('/api/v1/export');
  return response.data;
} on DioException catch (e) {
  if (e.response != null) {
    throw Exception('HTTP ${e.response!.statusCode}: ${e.response!.data}');
  }

  throw Exception(e.message ?? 'Network request failed');
}
```

## Uploading images

Grim's backend import route expects `multipart/form-data` with an `image` field.

Dio's `FormData` and `MultipartFile` support maps cleanly onto that contract:

```dart
import 'package:dio/dio.dart';

Future<void> uploadImage(Dio dio, String imagePath) async {
  final formData = FormData.fromMap({
    'image': await MultipartFile.fromFile(
      imagePath,
      filename: 'capture.jpg',
    ),
  });

  await dio.post('/api/v1/import', data: formData);
}
```

Important upstream note: create a fresh `FormData` and `MultipartFile` for each request. The Dio docs warn against reusing the same instances across repeated uploads because that can lead to finalize errors.

## Request cancellation

Use `CancelToken` for requests that are tied to a screen lifecycle or a user action.

Example:

```dart
final cancelToken = CancelToken();

final future = dio.get(
  '/api/v1/export',
  cancelToken: cancelToken,
);

// Later:
cancelToken.cancel('User left the screen');
```

This is especially useful for:

- in-flight export refreshes
- long-running uploads the user abandons
- repeated queries from pull-to-refresh or search UI

## Grim-specific notes

- Keep the base URL configurable per environment instead of hardcoding localhost values into feature widgets.
- `GrimEndpoints.initialize()` runs during app startup to detect simulator/emulator vs physical device for debug URLs.
- Release builds use `GRIM_RELEASE_API_PREFIX` for `/api/v1/*` routes and `GRIM_RELEASE_HEALTH_URL` for `/health`.
- If the sender camera flow uploads captured images, pass file paths from the camera package into Dio; do not hold large binary payloads in Riverpod state unless necessary.
- The `POST /api/v1/import` route is documented as server-sent events on success in `docs/specification.md`; if the mobile app consumes that streaming response, validate whether plain Dio is enough for the final UX or whether that route should gain a mobile-friendly polling or non-SSE alternative.

## References

- Dio package: https://pub.dev/packages/dio
- Dio API docs: https://pub.dev/documentation/dio/latest/
- `Dio` class: https://pub.dev/documentation/dio/latest/dio/Dio-class.html
- `LogInterceptor` class: https://pub.dev/documentation/dio/latest/dio/LogInterceptor-class.html
- Grim backend contract: `backend/openapi.yaml`, `docs/specification.md`

---

**Updated:** 2026-04-19  
**Applies to:** grim mobile (`mobile/`) talking to the current grim backend API  
**Doc version:** 1  
**Upstream refs:**  
- https://pub.dev/packages/dio  
- https://pub.dev/documentation/dio/latest/  
- https://pub.dev/documentation/dio/latest/dio/Dio-class.html  
- https://pub.dev/documentation/dio/latest/dio/LogInterceptor-class.html
