#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
DASHBOARD_DIR="$ROOT_DIR/dashboard"
RELEASES_DIR="$ROOT_DIR/artifacts/releases"

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    printf 'missing required command: %s\n' "$name" >&2
    exit 1
  fi
}

require_command git
require_command go
require_command bun
require_command tar
require_command sha256sum

mkdir -p "$RELEASES_DIR"

SHORT_SHA="$(git -C "$ROOT_DIR" rev-parse --short HEAD)"
FULL_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"
DIRTY_SUFFIX=""
if [[ -n "$(git -C "$ROOT_DIR" status --short)" ]]; then
  DIRTY_SUFFIX="-dirty"
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE_NAME="payment-platform-${STAMP}-${SHORT_SHA}${DIRTY_SUFFIX}"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/payment-platform-release.XXXXXX")"
STAGE_DIR="$WORK_DIR/$RELEASE_NAME"

mkdir -p \
  "$STAGE_DIR/bin" \
  "$STAGE_DIR/db" \
  "$STAGE_DIR/dashboard" \
  "$STAGE_DIR/deploy/systemd"

printf 'building dashboard production assets\n'
(
  cd "$DASHBOARD_DIR"
  bun run build
)

printf 'building backend binaries\n'
(
  cd "$BACKEND_DIR"
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "$STAGE_DIR/bin/api" ./cmd/api
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "$STAGE_DIR/bin/worker" ./cmd/worker
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "$STAGE_DIR/bin/migrate" ./cmd/migrate
)

cp -R "$BACKEND_DIR/db/migrations" "$STAGE_DIR/db/migrations"
cp -R "$DASHBOARD_DIR/dist" "$STAGE_DIR/dashboard/dist"
cp "$BACKEND_DIR/.env.production.example" "$STAGE_DIR/.env.production.example"
cp "$ROOT_DIR/README.md" "$STAGE_DIR/README.md"
cp "$ROOT_DIR/docs/internal-release-checklist.md" "$STAGE_DIR/deploy/internal-release-checklist.md"
cp "$ROOT_DIR/deploy/README.md" "$STAGE_DIR/deploy/README.md"
cp "$ROOT_DIR/deploy/systemd/"*.service "$STAGE_DIR/deploy/systemd/"

cat >"$STAGE_DIR/RELEASE_MANIFEST.txt" <<EOF
release_name=$RELEASE_NAME
git_sha=$FULL_SHA
git_short_sha=$SHORT_SHA
build_time_utc=$STAMP
bundle_builder=$(whoami)
dashboard_build_command=bun run build
backend_build_command=CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build
EOF

ARCHIVE_PATH="$RELEASES_DIR/$RELEASE_NAME.tar.gz"
CHECKSUM_PATH="$ARCHIVE_PATH.sha256"

(
  cd "$WORK_DIR"
  tar -czf "$ARCHIVE_PATH" "$RELEASE_NAME"
)

sha256sum "$ARCHIVE_PATH" >"$CHECKSUM_PATH"

printf 'release bundle created\n'
printf 'archive=%s\n' "$ARCHIVE_PATH"
printf 'checksum=%s\n' "$CHECKSUM_PATH"
