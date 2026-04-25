# Mobile code rules (Flutter)

Conventions for Grim’s Flutter client under `mobile/` and internal packages under `mobile/packages/`. This complements **`docs/code-rules/project-architecture.md`**, which covers the backend only.

## Feature module layout

Group each feature by **module name** (e.g. `sender`, `splash`). Under that module, keep layers explicit and dependency direction one-way: **presentation → application → domain ← data**.

```text
<module>/
  presentation/
    pages/
    widgets/
  application/
    <module>_controller.dart
    <module>_state.dart
    <module>_providers.dart
  domain/
    <module>_model.dart
    <module>_repository.dart
  data/
    <module>_repository_impl.dart
    <module>_remote_data_source.dart
    <module>_local_data_source.dart
```

| Layer | Role |
|--------|------|
| **`presentation/pages/`** | Route-level screens: composition, navigation hooks, minimal logic. |
| **`presentation/widgets/`** | Reusable UI for that module only; no data sources or repositories. |
| **`application/`** | Riverpod (or equivalent) controllers, immutable state, and provider wiring for the module. |
| **`domain/`** | Entities/value objects and repository **interfaces**; no Flutter or I/O SDK imports. |
| **`data/`** | Repository implementations and remote/local data sources; maps DTOs ↔ domain models. |

**Imports:** `presentation` may import `application` and `domain`. `application` may import `domain` only. `data` may import `domain` (to implement contracts), not the reverse. `domain` must not import `presentation`, `application`, or `data`.

## One widget per file

- Under **`presentation/`** (both `pages/` and `widgets/`), each **`.dart` file** is responsible for **one** primary widget: a single top-level `StatelessWidget`, `StatefulWidget`, or other public `Widget` type that the file is named for.
- A **`StatefulWidget`** and its private **`State<…>`** class stay in the **same** file; that still counts as one widget for this rule.
- **Do not** place multiple unrelated top-level widget types in one file; split them so names, imports, and reviews stay aligned (`my_action_bar.dart` → `MyActionBar`).

## Independent screen views

- Each **page** under `presentation/pages/` should stand alone as a **view**: it receives inputs (constructor, `ProviderScope` overrides, or providers) and renders; it does not reach into another feature’s private widgets or controllers.
- **Do not** couple screens by importing sibling feature trees for convenience. Shared UI belongs in **`grim_core`** (or the agreed shared UI package), not in ad-hoc cross-feature imports.
- **Do not** embed third-party SDK calls (Dio, Firebase, camera, etc.) directly in `pages/` or `widgets/`; keep them in **`data/`** or behind services exported from **core** (see below).

## Core package and dependencies

The shared **core** package (e.g. **`mobile/packages/grim_core`**) is the **single home** for cross-cutting client and platform concerns. It should contain **all** of the following; feature modules consume them via **`grim_core`**, not by re-implementing or re-declaring the same concerns.

| In core | Examples |
|--------|-----------|
| **API client** | Shared Dio (or other) instance, base URL/env wiring, interceptors, auth headers, error mapping, download/upload helpers used by more than one feature. |
| **Functions** | Shared pure or side-effecting helpers used across features (parsing, formatting, validation, result types) that are not tied to one module’s domain. |
| **Libs** | Thin wrappers around third-party SDKs, extension methods on external types, logging, analytics hooks, `path`/`crypto`/similar utilities—anything that would otherwise be duplicated under `mobile/packages/*`. |

- **Screen / feature packages** — every **`mobile/packages/<name>/`** module that exposes **presentation** (pages, routes, or screen-level flows) **must** declare **`grim_core`** under **`dependencies`** in **`pubspec.yaml`** (path dependency to **`../grim_core`** or the canonical core path). Do **not** omit **`grim_core`** because a package is “UI only” today; new shared APIs should be reachable without ad-hoc new roots.
- The **`mobile`** root package should also depend on **`grim_core`** whenever **`mobile/lib/`** defines screens, routing, or app chrome that should use the same client, theme tokens, or helpers as packages.
- **Feature packages** (`grim_splash`, `grim_sender_camera`, …) import **`package:grim_core/...`** for HTTP, env, Firebase usage, storage, device APIs, and shared helpers. They **do not** add their own parallel **`dio`**, **`firebase_*`**, or other **core-owned** dependencies unless there is a documented exception.
- **Module `data/` layers** use types and clients **exported from core** (or injected providers defined there); they implement feature-specific endpoints and DTO mapping on top of the shared client, not a second HTTP stack.

App-level bootstrap (e.g. `Firebase.initializeApp`, `runApp`) stays in **`mobile/lib/main.dart`** per **`docs/mobile/dependencies/`**; day-to-day API and SDK usage still flows through **core** APIs inside features.

## Where modules live

- **App shell and routing** — `mobile/lib/` (e.g. `main.dart`, router, theme).
- **Large or reusable features** — optional **`mobile/packages/<name>/`** with the same internal layout as above inside `lib/src/` or `lib/features/<module>/`, consistent with the rest of the repo.

When the on-disk tree catches up with these rules, prefer updating this document in the same change so paths stay accurate.

## Related documentation

- **`docs/mobile/dependencies/`** — Dio, Firebase, FCM, camera, and other client integration notes.
- **`docs/code-rules/code-practice.md`** — Backend placement patterns (mobile-specific placement is this file).
