# mobile

AirEye mobile app.

## Getting Started

Create a local environment file before running the app:

```sh
cp .env.local.example .env.local
```

Fill in the values, including `AIREYE_API_KEY`, then run through the helper so
the file is passed as Flutter `--dart-define` values:

```sh
./run.sh run
```
