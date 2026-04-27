#!/bin/bash
# Load .env.local and run flutter with all vars as --dart-define flags.
# Usage: ./run.sh [flutter args]   e.g. ./run.sh run  or  ./run.sh build apk

set -e

ENV_FILE=".env.local"

if [ $# -eq 0 ]; then
  set -- run
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found. Copy .env.local.example and fill in your values."
  exit 1
fi

DEFINES=""
while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  [[ -z "$value" ]] && continue
  DEFINES="$DEFINES --dart-define=$key=$value"
done < "$ENV_FILE"

flutter "$@" $DEFINES
