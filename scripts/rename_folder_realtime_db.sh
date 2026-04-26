#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <old_path> <new_path> [--project <firebase_project_id>]"
  echo "  Example: $0 /production/uploads /production/AZ-204 --project grim-bd508"
  exit 1
}

if [[ $# -lt 2 ]]; then
  usage
fi

OLD_PATH="$1"
NEW_PATH="$2"
shift 2

PROJECT_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_ARGS=(--project "$2")
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      usage
      ;;
  esac
done

BACKUP_FILE="$(mktemp /tmp/rtdb_rename_XXXXXX.json)"
trap 'rm -f "$BACKUP_FILE"' EXIT

echo "Reading data from $OLD_PATH..."
firebase database:get "$OLD_PATH" "${PROJECT_ARGS[@]}" --output "$BACKUP_FILE"

if [[ ! -s "$BACKUP_FILE" ]] || [[ "$(cat "$BACKUP_FILE")" == "null" ]]; then
  echo "Error: no data found at $OLD_PATH"
  exit 1
fi

echo "Writing data to $NEW_PATH..."
firebase database:set "$NEW_PATH" "$BACKUP_FILE" "${PROJECT_ARGS[@]}" --force

echo "Deleting old path $OLD_PATH..."
firebase database:remove "$OLD_PATH" "${PROJECT_ARGS[@]}" --force

echo "Done. Renamed $OLD_PATH -> $NEW_PATH"
