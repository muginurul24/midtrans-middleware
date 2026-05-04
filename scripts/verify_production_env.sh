#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_ENV_FILE="$ROOT_DIR/backend/.env"
ENV_FILE="${1:-$DEFAULT_ENV_FILE}"

if [[ ! -f "$ENV_FILE" ]]; then
  printf 'env file not found: %s\n' "$ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

failures=0
warnings=0

pass() {
  printf 'PASS  %s\n' "$1"
}

warn() {
  warnings=$((warnings + 1))
  printf 'WARN  %s\n' "$1"
}

fail() {
  failures=$((failures + 1))
  printf 'FAIL  %s\n' "$1"
}

require_non_empty() {
  local key="$1"
  local value="${!key:-}"
  if [[ -n "$value" ]]; then
    pass "$key is set"
  else
    fail "$key is missing"
  fi
}

require_equals() {
  local key="$1"
  local expected="$2"
  local actual="${!key:-}"
  if [[ "$actual" == "$expected" ]]; then
    pass "$key matches expected value"
  else
    fail "$key must be '$expected' (got '${actual:-<empty>}')"
  fi
}

require_integer() {
  local key="$1"
  local value="${!key:-}"
  if [[ "$value" =~ ^[0-9]+$ ]]; then
    pass "$key is numeric"
  else
    fail "$key must be numeric (got '${value:-<empty>}')"
  fi
}

validate_https_csv() {
  local key="$1"
  local raw="${!key:-}"
  if [[ -z "$raw" ]]; then
    fail "$key is missing"
    return
  fi

  local item
  local local_fail=0
  IFS=',' read -r -a values <<<"$raw"
  for item in "${values[@]}"; do
    item="${item#"${item%%[![:space:]]*}"}"
    item="${item%"${item##*[![:space:]]}"}"
    if [[ -z "$item" ]]; then
      continue
    fi

    if [[ "$item" != https://* ]]; then
      fail "$key must only contain https origins or URLs (invalid: $item)"
      local_fail=1
      continue
    fi

    if [[ "$item" == *"localhost"* || "$item" == *"127.0.0.1"* || "$item" == *"::1"* ]]; then
      fail "$key must not contain loopback host (invalid: $item)"
      local_fail=1
      continue
    fi

    if [[ "$item" == *"*"* ]]; then
      fail "$key must not contain wildcard entry (invalid: $item)"
      local_fail=1
    fi
  done

  if [[ "$local_fail" -eq 0 ]]; then
    pass "$key only contains public https values"
  fi
}

require_non_empty APP_ENV
require_equals APP_ENV production

for key in \
  JWT_ACCESS_SECRET \
  JWT_REFRESH_SECRET \
  TOKEN_PEPPER \
  MFA_ENCRYPTION_KEY \
  WEBHOOK_SIGNING_PEPPER \
  ALERT_ENDPOINT_PEPPER \
  MIDTRANS_SERVER_KEY \
  DATABASE_URL \
  REDIS_ADDR
do
  require_non_empty "$key"
done

require_equals MIDTRANS_ENV production
require_equals MIDTRANS_API_BASE_URL https://api.midtrans.com/v2
validate_https_csv DASHBOARD_ALLOWED_ORIGINS

if [[ -n "${MIDTRANS_OVERRIDE_NOTIFICATION_URLS:-}" ]]; then
  validate_https_csv MIDTRANS_OVERRIDE_NOTIFICATION_URLS
else
  pass "MIDTRANS_OVERRIDE_NOTIFICATION_URLS is empty"
fi

require_integer APP_PORT
require_integer WORKER_METRICS_PORT
require_integer REDIS_DB
require_integer WORKER_CONCURRENCY

if [[ "${APP_PORT:-}" == "${WORKER_METRICS_PORT:-}" ]]; then
  fail "APP_PORT and WORKER_METRICS_PORT must not be identical"
else
  pass "APP_PORT and WORKER_METRICS_PORT do not collide"
fi

if [[ "${LOG_LEVEL:-info}" == "debug" ]]; then
  warn "LOG_LEVEL is debug in production env"
else
  pass "LOG_LEVEL is not debug"
fi

if [[ -n "${DASHBOARD_DIST_DIR:-}" ]]; then
  pass "DASHBOARD_DIST_DIR is set"
else
  warn "DASHBOARD_DIST_DIR is empty; API will rely on relative default lookup"
fi

if [[ "$failures" -gt 0 ]]; then
  printf '\nproduction env verification failed with %d issue(s) and %d warning(s)\n' "$failures" "$warnings" >&2
  exit 1
fi

printf '\nproduction env verification passed with %d warning(s)\n' "$warnings"
