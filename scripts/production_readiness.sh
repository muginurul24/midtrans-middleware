#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
DASHBOARD_DIR="$ROOT_DIR/dashboard"

step() {
  printf '\n==> %s\n' "$1"
}

step "Backend tests"
(
  cd "$BACKEND_DIR"
  go test ./...
)

step "Backend build"
(
  cd "$BACKEND_DIR"
  go build ./...
)

step "Dashboard typecheck"
(
  cd "$DASHBOARD_DIR"
  bun run check
)

step "Store contract sync"
(
  cd "$DASHBOARD_DIR"
  bun run contract:check
)

step "Dashboard build"
(
  cd "$DASHBOARD_DIR"
  bun run build
)

step "Operational smoke"
"$ROOT_DIR/scripts/operational_smoke.sh"

printf '\nproduction readiness checks passed\n'
