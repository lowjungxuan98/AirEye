#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/mobile"
ANDROID_DIR="$MOBILE_DIR/android"
KEYSTORE_PATH="$ANDROID_DIR/app/upload-keystore.jks"
KEY_PROPERTIES_PATH="$ANDROID_DIR/key.properties"
LOCAL_ENV_PATH="$MOBILE_DIR/.env.local"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

prompt_value() {
  local name="$1"
  local default_value="${2:-}"
  local value
  if [[ -n "$default_value" ]]; then
    read -r -p "$name [$default_value]: " value
    printf '%s' "${value:-$default_value}"
  else
    read -r -p "$name: " value
    printf '%s' "$value"
  fi
}

prompt_secret() {
  local name="$1"
  local value
  read -r -s -p "$name: " value
  echo
  printf '%s' "$value"
}

secret_set() {
  local name="$1"
  local value="$2"
  gh secret set "$name" --body "$value"
}

encode_base64_one_line() {
  openssl base64 -A -in "$1"
}

require_command flutter
require_command gh
require_command keytool
require_command base64

mkdir -p "$(dirname "$KEYSTORE_PATH")"

echo "Repository: $(cd "$ROOT_DIR" && gh repo view --json nameWithOwner -q .nameWithOwner)"
echo

key_alias="$(prompt_value "Android key alias" "grim_upload")"
store_password="$(prompt_secret "Android keystore password")"
key_password="$(prompt_secret "Android key password (can match keystore password)")"

if [[ ! -f "$KEYSTORE_PATH" ]]; then
  keytool -genkeypair \
    -v \
    -storetype JKS \
    -keystore "$KEYSTORE_PATH" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -alias "$key_alias" \
    -storepass "$store_password" \
    -keypass "$key_password" \
    -dname "CN=GRIM, OU=Mobile, O=GRIM, L=Singapore, S=Singapore, C=SG"
else
  echo "Using existing keystore at $KEYSTORE_PATH"
fi

cat > "$KEY_PROPERTIES_PATH" <<EOF
storePassword=$store_password
keyPassword=$key_password
keyAlias=$key_alias
storeFile=app/upload-keystore.jks
EOF

mac_ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
mac_ip="${mac_ip:-192.168.68.57}"
firebase_android_api_key="$(prompt_secret "Firebase Android API key")"
firebase_ios_api_key="$(prompt_secret "Firebase iOS API key")"

cat > "$LOCAL_ENV_PATH" <<EOF
FIREBASE_ANDROID_API_KEY=$firebase_android_api_key
FIREBASE_IOS_API_KEY=$firebase_ios_api_key
GRIM_DEBUG_PHYSICAL_DEVICE_ORIGIN=http://$mac_ip:3001
GRIM_RELEASE_API_PREFIX=https://lowjungxuan.dpdns.org/backend/api
GRIM_RELEASE_HEALTH_URL=https://lowjungxuan.dpdns.org/backend/api/v1/health
EOF

echo
echo "Uploading GitHub Actions secrets with gh..."
secret_set MOBILE_ANDROID_KEYSTORE_BASE64 "$(encode_base64_one_line "$KEYSTORE_PATH")"
secret_set MOBILE_ANDROID_KEYSTORE_PASSWORD "$store_password"
secret_set MOBILE_ANDROID_KEY_ALIAS "$key_alias"
secret_set MOBILE_ANDROID_KEY_PASSWORD "$key_password"
secret_set FIREBASE_ANDROID_API_KEY "$firebase_android_api_key"
secret_set FIREBASE_IOS_API_KEY "$firebase_ios_api_key"

echo
echo "Local setup files written:"
echo "  $KEYSTORE_PATH"
echo "  $KEY_PROPERTIES_PATH"
echo "  $LOCAL_ENV_PATH"
echo
echo "Run locally with:"
echo "  cd mobile"
echo "  flutter pub get"
echo "  flutter run --dart-define-from-file=.env.local"
