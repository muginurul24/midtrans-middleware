#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
DASHBOARD_DIR="$ROOT_DIR/dashboard"

API_PORT="${API_PORT:-18080}"
MIDTRANS_PORT="${MIDTRANS_PORT:-18082}"
CALLBACK_PORT="${CALLBACK_PORT:-18083}"
WORKER_METRICS_PORT="${WORKER_METRICS_PORT:-19091}"
SMOKE_MIDTRANS_SERVER_KEY="${SMOKE_MIDTRANS_SERVER_KEY:-smoke-server-key}"

ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/payment-platform-smoke.XXXXXX")"
MIDTRANS_LOG="$ARTIFACT_DIR/mock-midtrans.log"
CALLBACK_LOG="$ARTIFACT_DIR/mock-callback.log"
API_LOG="$ARTIFACT_DIR/api.log"
WORKER_LOG="$ARTIFACT_DIR/worker.log"
CALLBACK_STATE_FILE="$ARTIFACT_DIR/callback-state.json"

MIGRATE_OUTPUT=""
DASHBOARD_BUILD_OUTPUT=""
REGISTER_OUTPUT=""
STORE_OUTPUT=""
TOKEN_OUTPUT=""
CHARGE_OUTPUT=""
TRANSACTION_OUTPUT=""
WEBHOOK_OUTPUT=""
DELIVERIES_OUTPUT=""
METRICS_OUTPUT=""

API_BASE_URL="http://127.0.0.1:${API_PORT}"
WORKER_METRICS_URL="http://127.0.0.1:${WORKER_METRICS_PORT}/metrics"
BASE_DATABASE_URL=""
SMOKE_DATABASE_URL=""
SMOKE_SCHEMA=""

declare -a BG_PIDS=()

cleanup() {
  local exit_code="$?"

  for pid in "${BG_PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
    fi
  done

  if [[ -n "$BASE_DATABASE_URL" && -n "$SMOKE_SCHEMA" ]]; then
    psql "$BASE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS \"$SMOKE_SCHEMA\" CASCADE" >/dev/null 2>&1 || true
  fi

  if [[ "$exit_code" -eq 0 ]]; then
    printf 'operational smoke passed\n'
  else
    printf 'operational smoke failed\n' >&2
  fi

  printf 'artifacts=%s\n' "$ARTIFACT_DIR"
  exit "$exit_code"
}

trap cleanup EXIT

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'missing required command: %s\n' "$command_name" >&2
    exit 1
  fi
}

wait_for_http() {
  local url="$1"
  local name="$2"
  local attempt=0

  until curl -fsS "$url" >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [[ "$attempt" -ge 60 ]]; then
      printf 'timeout waiting for %s at %s\n' "$name" "$url" >&2
      exit 1
    fi
    sleep 1
  done
}

write_json_file() {
  local path="$1"
  local content="$2"
  printf '%s' "$content" >"$path"
}

start_background() {
  local log_file="$1"
  shift

  (
    "$@"
  ) >"$log_file" 2>&1 &

  BG_PIDS+=("$!")
}

require_command go
require_command pnpm
require_command curl
require_command jq
require_command psql
require_command rg
require_command sha512sum

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  printf 'backend/.env is required for operational smoke\n' >&2
  exit 1
fi

set -a
source "$BACKEND_DIR/.env"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  printf 'DATABASE_URL is required in backend/.env\n' >&2
  exit 1
fi

BASE_DATABASE_URL="$DATABASE_URL"
SMOKE_SCHEMA="smoke_$(date +%s)_$RANDOM"
psql "$BASE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE SCHEMA \"$SMOKE_SCHEMA\"" >/dev/null

if [[ "$BASE_DATABASE_URL" == *\?* ]]; then
  SMOKE_DATABASE_URL="${BASE_DATABASE_URL}&search_path=${SMOKE_SCHEMA}%2Cpublic"
else
  SMOKE_DATABASE_URL="${BASE_DATABASE_URL}?search_path=${SMOKE_SCHEMA}%2Cpublic"
fi

MIGRATE_OUTPUT="$ARTIFACT_DIR/migrate.out"
(
  cd "$BACKEND_DIR"
  set -a
  source .env
  set +a
  DATABASE_URL="$SMOKE_DATABASE_URL" go run ./cmd/migrate up
) | tee "$MIGRATE_OUTPUT" >/dev/null

DASHBOARD_BUILD_OUTPUT="$ARTIFACT_DIR/dashboard-build.out"
(
  cd "$DASHBOARD_DIR"
  pnpm build
) | tee "$DASHBOARD_BUILD_OUTPUT" >/dev/null

start_background "$MIDTRANS_LOG" bash -lc "
  cd \"$BACKEND_DIR\" &&
  SMOKE_MODE=midtrans SMOKE_ADDR=127.0.0.1:${MIDTRANS_PORT} go run ./cmd/smoke-support
"
start_background "$CALLBACK_LOG" bash -lc "
  cd \"$BACKEND_DIR\" &&
  SMOKE_MODE=callback SMOKE_ADDR=127.0.0.1:${CALLBACK_PORT} SMOKE_OUTPUT_FILE=\"$CALLBACK_STATE_FILE\" go run ./cmd/smoke-support
"

wait_for_http "http://127.0.0.1:${MIDTRANS_PORT}/healthz" "mock midtrans"
wait_for_http "http://127.0.0.1:${CALLBACK_PORT}/healthz" "mock callback"

start_background "$API_LOG" bash -lc "
  cd \"$BACKEND_DIR\" &&
  set -a &&
  source .env &&
  set +a &&
  DATABASE_URL=\"$SMOKE_DATABASE_URL\" \
  APP_PORT=${API_PORT} \
  WORKER_METRICS_PORT=${WORKER_METRICS_PORT} \
  MIDTRANS_SERVER_KEY=${SMOKE_MIDTRANS_SERVER_KEY} \
  MIDTRANS_API_BASE_URL=http://127.0.0.1:${MIDTRANS_PORT} \
  go run ./cmd/api
"
start_background "$WORKER_LOG" bash -lc "
  cd \"$BACKEND_DIR\" &&
  set -a &&
  source .env &&
  set +a &&
  DATABASE_URL=\"$SMOKE_DATABASE_URL\" \
  WORKER_METRICS_PORT=${WORKER_METRICS_PORT} \
  go run ./cmd/worker
"

wait_for_http "${API_BASE_URL}/healthz" "api"
wait_for_http "$WORKER_METRICS_URL" "worker metrics"

EMAIL="smoke-$(date +%s)@example.com"
SECOND_EMAIL="smoke-second-$(date +%s)@example.com"
INITIAL_PASSWORD="SuperSecure123"
UPDATED_PASSWORD="SuperSecure456"
STORE_SLUG="smoke-$(date +%s)"
SECOND_STORE_SLUG="smoke-second-$(date +%s)"
ORDER_ID="smoke-order-$(date +%s)"
INVALID_WEBHOOK_ORDER_ID="smoke-invalid-$(date +%s)"
CALLBACK_URL="http://127.0.0.1:${CALLBACK_PORT}/webhooks/store"

REGISTER_OUTPUT="$ARTIFACT_DIR/register.json"
register_payload="$(jq -nc --arg name "Smoke Runner" --arg email "$EMAIL" --arg password "$INITIAL_PASSWORD" '{name:$name,email:$email,password:$password}')"
curl -fsS -X POST "${API_BASE_URL}/v1/dashboard/auth/register" \
  -H 'Content-Type: application/json' \
  -d "$register_payload" >"$REGISTER_OUTPUT"

DASHBOARD_ACCESS_TOKEN="$(jq -r '.data.tokens.access_token' "$REGISTER_OUTPUT")"
DASHBOARD_REFRESH_TOKEN="$(jq -r '.data.tokens.refresh_token' "$REGISTER_OUTPUT")"
if [[ -z "$DASHBOARD_ACCESS_TOKEN" || "$DASHBOARD_ACCESS_TOKEN" == "null" ]]; then
  printf 'dashboard access token missing\n' >&2
  exit 1
fi
if [[ -z "$DASHBOARD_REFRESH_TOKEN" || "$DASHBOARD_REFRESH_TOKEN" == "null" ]]; then
  printf 'dashboard refresh token missing\n' >&2
  exit 1
fi

ME_OUTPUT="$ARTIFACT_DIR/me.json"
me_status_code="$(curl -sS -o "$ME_OUTPUT" -w '%{http_code}' "${API_BASE_URL}/v1/dashboard/me" \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}")"
if [[ "$me_status_code" != "200" ]]; then
  printf 'me failed with status %s\n' "$me_status_code" >&2
  exit 1
fi
jq -e --arg email "$EMAIL" '.data.user.email == $email' "$ME_OUTPUT" >/dev/null

REFRESH_OUTPUT="$ARTIFACT_DIR/refresh.json"
refresh_payload="$(jq -nc --arg refresh_token "$DASHBOARD_REFRESH_TOKEN" '{refresh_token:$refresh_token}')"
refresh_status_code="$(curl -sS -o "$REFRESH_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/dashboard/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "$refresh_payload")"
if [[ "$refresh_status_code" != "200" ]]; then
  printf 'refresh failed with status %s\n' "$refresh_status_code" >&2
  exit 1
fi
DASHBOARD_ACCESS_TOKEN="$(jq -r '.data.tokens.access_token' "$REFRESH_OUTPUT")"
DASHBOARD_REFRESH_TOKEN="$(jq -r '.data.tokens.refresh_token' "$REFRESH_OUTPUT")"

logout_status_code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "${API_BASE_URL}/v1/dashboard/auth/logout" \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}")"
if [[ "$logout_status_code" != "204" ]]; then
  printf 'logout failed with status %s\n' "$logout_status_code" >&2
  exit 1
fi

LOGIN_OUTPUT="$ARTIFACT_DIR/login.json"
login_payload="$(jq -nc --arg email "$EMAIL" --arg password "$INITIAL_PASSWORD" '{email:$email,password:$password}')"
login_status_code="$(curl -sS -o "$LOGIN_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/dashboard/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$login_payload")"
if [[ "$login_status_code" != "200" ]]; then
  printf 'login failed with status %s\n' "$login_status_code" >&2
  exit 1
fi
DASHBOARD_ACCESS_TOKEN="$(jq -r '.data.tokens.access_token' "$LOGIN_OUTPUT")"
DASHBOARD_REFRESH_TOKEN="$(jq -r '.data.tokens.refresh_token' "$LOGIN_OUTPUT")"

change_password_payload="$(jq -nc --arg current_password "$INITIAL_PASSWORD" --arg new_password "$UPDATED_PASSWORD" '{current_password:$current_password,new_password:$new_password}')"
change_password_status_code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "${API_BASE_URL}/v1/dashboard/auth/change-password" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}" \
  -d "$change_password_payload")"
if [[ "$change_password_status_code" != "204" ]]; then
  printf 'change password failed with status %s\n' "$change_password_status_code" >&2
  exit 1
fi

logout_after_password_status_code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "${API_BASE_URL}/v1/dashboard/auth/logout" \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}")"
if [[ "$logout_after_password_status_code" != "204" ]]; then
  printf 'logout after password change failed with status %s\n' "$logout_after_password_status_code" >&2
  exit 1
fi

LOGIN_OLD_PASSWORD_OUTPUT="$ARTIFACT_DIR/login-old-password.json"
login_old_password_payload="$(jq -nc --arg email "$EMAIL" --arg password "$INITIAL_PASSWORD" '{email:$email,password:$password}')"
login_old_password_status_code="$(curl -sS -o "$LOGIN_OLD_PASSWORD_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/dashboard/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$login_old_password_payload")"
if [[ "$login_old_password_status_code" != "401" ]]; then
  printf 'old password should fail login, got status %s\n' "$login_old_password_status_code" >&2
  exit 1
fi

LOGIN_NEW_PASSWORD_OUTPUT="$ARTIFACT_DIR/login-new-password.json"
login_new_password_payload="$(jq -nc --arg email "$EMAIL" --arg password "$UPDATED_PASSWORD" '{email:$email,password:$password}')"
login_new_password_status_code="$(curl -sS -o "$LOGIN_NEW_PASSWORD_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/dashboard/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$login_new_password_payload")"
if [[ "$login_new_password_status_code" != "200" ]]; then
  printf 'new password login failed with status %s\n' "$login_new_password_status_code" >&2
  exit 1
fi
DASHBOARD_ACCESS_TOKEN="$(jq -r '.data.tokens.access_token' "$LOGIN_NEW_PASSWORD_OUTPUT")"
DASHBOARD_REFRESH_TOKEN="$(jq -r '.data.tokens.refresh_token' "$LOGIN_NEW_PASSWORD_OUTPUT")"

STORE_OUTPUT="$ARTIFACT_DIR/store.json"
store_payload="$(jq -nc --arg name "Smoke Store" --arg slug "$STORE_SLUG" --arg callback "$CALLBACK_URL" '{name:$name,slug:$slug,domain:"",default_callback_url:$callback}')"
curl -fsS -X POST "${API_BASE_URL}/v1/dashboard/stores" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}" \
  -d "$store_payload" >"$STORE_OUTPUT"

STORE_ID="$(jq -r '.data.id' "$STORE_OUTPUT")"
if [[ -z "$STORE_ID" || "$STORE_ID" == "null" ]]; then
  printf 'store id missing\n' >&2
  exit 1
fi

STORE_UPDATE_OUTPUT="$ARTIFACT_DIR/store-update.json"
store_update_payload="$(jq -nc --arg name "Smoke Store Updated" --arg callback "$CALLBACK_URL" '{name:$name,default_callback_url:$callback}')"
store_update_status_code="$(curl -sS -o "$STORE_UPDATE_OUTPUT" -w '%{http_code}' -X PATCH "${API_BASE_URL}/v1/dashboard/stores/${STORE_ID}" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}" \
  -d "$store_update_payload")"
if [[ "$store_update_status_code" != "200" ]]; then
  printf 'store update failed with status %s\n' "$store_update_status_code" >&2
  exit 1
fi
jq -e '.data.name == "Smoke Store Updated"' "$STORE_UPDATE_OUTPUT" >/dev/null

VIEW_SECRET_OUTPUT="$ARTIFACT_DIR/store-webhook-secret.json"
view_secret_status_code="$(curl -sS -o "$VIEW_SECRET_OUTPUT" -w '%{http_code}' "${API_BASE_URL}/v1/dashboard/stores/${STORE_ID}/webhook-secret" \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}")"
if [[ "$view_secret_status_code" != "200" ]]; then
  printf 'view webhook secret failed with status %s\n' "$view_secret_status_code" >&2
  exit 1
fi
WEBHOOK_SECRET_BEFORE_ROTATE="$(jq -r '.data.secret' "$VIEW_SECRET_OUTPUT")"
if [[ -z "$WEBHOOK_SECRET_BEFORE_ROTATE" || "$WEBHOOK_SECRET_BEFORE_ROTATE" == "null" ]]; then
  printf 'webhook secret missing before rotate\n' >&2
  exit 1
fi

ROTATE_SECRET_OUTPUT="$ARTIFACT_DIR/store-webhook-secret-rotate.json"
rotate_secret_status_code="$(curl -sS -o "$ROTATE_SECRET_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/dashboard/stores/${STORE_ID}/webhook-secret/rotate" \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}")"
if [[ "$rotate_secret_status_code" != "200" ]]; then
  printf 'rotate webhook secret failed with status %s\n' "$rotate_secret_status_code" >&2
  exit 1
fi
WEBHOOK_SECRET_AFTER_ROTATE="$(jq -r '.data.secret' "$ROTATE_SECRET_OUTPUT")"
if [[ -z "$WEBHOOK_SECRET_AFTER_ROTATE" || "$WEBHOOK_SECRET_AFTER_ROTATE" == "null" ]]; then
  printf 'webhook secret missing after rotate\n' >&2
  exit 1
fi
if [[ "$WEBHOOK_SECRET_BEFORE_ROTATE" == "$WEBHOOK_SECRET_AFTER_ROTATE" ]]; then
  printf 'webhook secret did not rotate\n' >&2
  exit 1
fi

TOKEN_OUTPUT="$ARTIFACT_DIR/token.json"
token_payload="$(jq -nc '{name:"Smoke Token",scopes:["transaction:create","transaction:read"]}')"
curl -fsS -X POST "${API_BASE_URL}/v1/dashboard/stores/${STORE_ID}/api-tokens" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}" \
  -d "$token_payload" >"$TOKEN_OUTPUT"

TOKEN_ID="$(jq -r '.data.id' "$TOKEN_OUTPUT")"
STORE_API_TOKEN="$(jq -r '.data.token' "$TOKEN_OUTPUT")"
if [[ -z "$STORE_API_TOKEN" || "$STORE_API_TOKEN" == "null" ]]; then
  printf 'store api token missing\n' >&2
  exit 1
fi
if [[ -z "$TOKEN_ID" || "$TOKEN_ID" == "null" ]]; then
  printf 'store api token id missing\n' >&2
  exit 1
fi

SECOND_TOKEN_OUTPUT="$ARTIFACT_DIR/token-second.json"
second_token_payload="$(jq -nc '{name:"Smoke Token Revoke",scopes:["transaction:read"]}')"
second_token_status_code="$(curl -sS -o "$SECOND_TOKEN_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/dashboard/stores/${STORE_ID}/api-tokens" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}" \
  -d "$second_token_payload")"
if [[ "$second_token_status_code" != "201" ]]; then
  printf 'second token creation failed with status %s\n' "$second_token_status_code" >&2
  exit 1
fi
SECOND_TOKEN_ID="$(jq -r '.data.id' "$SECOND_TOKEN_OUTPUT")"

ROTATE_TOKEN_OUTPUT="$ARTIFACT_DIR/token-rotate.json"
rotate_token_status_code="$(curl -sS -o "$ROTATE_TOKEN_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/dashboard/stores/${STORE_ID}/api-tokens/${TOKEN_ID}/rotate" \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}")"
if [[ "$rotate_token_status_code" != "200" ]]; then
  printf 'token rotate failed with status %s\n' "$rotate_token_status_code" >&2
  exit 1
fi
ROTATED_TOKEN_ID="$(jq -r '.data.id' "$ROTATE_TOKEN_OUTPUT")"
ROTATED_STORE_API_TOKEN="$(jq -r '.data.token' "$ROTATE_TOKEN_OUTPUT")"
if [[ -z "$ROTATED_STORE_API_TOKEN" || "$ROTATED_STORE_API_TOKEN" == "null" ]]; then
  printf 'rotated store api token missing\n' >&2
  exit 1
fi
if [[ "$ROTATED_STORE_API_TOKEN" == "$STORE_API_TOKEN" ]]; then
  printf 'rotated store api token should differ from original token\n' >&2
  exit 1
fi
STORE_API_TOKEN="$ROTATED_STORE_API_TOKEN"

revoke_token_status_code="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE "${API_BASE_URL}/v1/dashboard/stores/${STORE_ID}/api-tokens/${SECOND_TOKEN_ID}" \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}")"
if [[ "$revoke_token_status_code" != "204" ]]; then
  printf 'token revoke failed with status %s\n' "$revoke_token_status_code" >&2
  exit 1
fi

TOKENS_LIST_OUTPUT="$ARTIFACT_DIR/tokens-list.json"
tokens_list_status_code="$(curl -sS -o "$TOKENS_LIST_OUTPUT" -w '%{http_code}' "${API_BASE_URL}/v1/dashboard/stores/${STORE_ID}/api-tokens" \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}")"
if [[ "$tokens_list_status_code" != "200" ]]; then
  printf 'token list failed with status %s\n' "$tokens_list_status_code" >&2
  exit 1
fi
jq -e --arg original_id "$TOKEN_ID" --arg revoked_id "$SECOND_TOKEN_ID" --arg rotated_id "$ROTATED_TOKEN_ID" '
  (.data.tokens | any(.id == $original_id and .revoked_at != null)) and
  (.data.tokens | any(.id == $revoked_id and .revoked_at != null)) and
  (.data.tokens | any(.id == $rotated_id and .revoked_at == null))
' "$TOKENS_LIST_OUTPUT" >/dev/null

CHARGE_OUTPUT="$ARTIFACT_DIR/charge.json"
charge_payload="$(jq -nc --arg order_id "$ORDER_ID" '{order_id:$order_id,amount:10000,currency:"IDR",payment_type:"bank_transfer",bank:"bca",customer:{name:"Smoke",email:"smoke@example.com",phone:"08123456789"},items:[],callback_url:"",metadata:{source:"operational-smoke"}}')"
charge_status_code="$(curl -sS -o "$CHARGE_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/transactions/charge" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${STORE_API_TOKEN}" \
  -H "Idempotency-Key: ${ORDER_ID}" \
  -d "$charge_payload")"

if [[ "$charge_status_code" != "201" ]]; then
  printf 'charge failed with status %s\n' "$charge_status_code" >&2
  exit 1
fi

TRANSACTION_ID="$(jq -r '.data.transaction_id' "$CHARGE_OUTPUT")"
PLATFORM_ORDER_ID="$(jq -r '.data.platform_order_id' "$CHARGE_OUTPUT")"
INITIAL_STATUS="$(jq -r '.data.status' "$CHARGE_OUTPUT")"
if [[ "$INITIAL_STATUS" != "pending" ]]; then
  printf 'unexpected initial transaction status: %s\n' "$INITIAL_STATUS" >&2
  exit 1
fi

CHARGE_REPLAY_OUTPUT="$ARTIFACT_DIR/charge-replay.json"
charge_replay_status_code="$(curl -sS -o "$CHARGE_REPLAY_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/transactions/charge" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${STORE_API_TOKEN}" \
  -H "Idempotency-Key: ${ORDER_ID}" \
  -d "$charge_payload")"
if [[ "$charge_replay_status_code" != "201" ]]; then
  printf 'charge replay failed with status %s\n' "$charge_replay_status_code" >&2
  exit 1
fi
REPLAY_TRANSACTION_ID="$(jq -r '.data.transaction_id' "$CHARGE_REPLAY_OUTPUT")"
if [[ "$REPLAY_TRANSACTION_ID" != "$TRANSACTION_ID" ]]; then
  printf 'charge replay returned different transaction id\n' >&2
  exit 1
fi

CHARGE_CONFLICT_OUTPUT="$ARTIFACT_DIR/charge-conflict.json"
charge_conflict_payload="$(jq -nc --arg order_id "$ORDER_ID" '{order_id:$order_id,amount:12000,currency:"IDR",payment_type:"bank_transfer",bank:"bca",customer:{name:"Smoke",email:"smoke@example.com",phone:"08123456789"},items:[],callback_url:"",metadata:{source:"operational-smoke-conflict"}}')"
charge_conflict_status_code="$(curl -sS -o "$CHARGE_CONFLICT_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/transactions/charge" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${STORE_API_TOKEN}" \
  -H "Idempotency-Key: ${ORDER_ID}-conflict" \
  -d "$charge_conflict_payload")"
if [[ "$charge_conflict_status_code" != "409" ]]; then
  printf 'charge conflict should return 409, got %s\n' "$charge_conflict_status_code" >&2
  exit 1
fi
jq -e '.error.code == "TRANSACTION_CONFLICT"' "$CHARGE_CONFLICT_OUTPUT" >/dev/null

TRANSACTION_OUTPUT="$ARTIFACT_DIR/transaction-before-webhook.json"
curl -fsS "${API_BASE_URL}/v1/transactions/${ORDER_ID}" \
  -H "Authorization: Bearer ${STORE_API_TOKEN}" >"$TRANSACTION_OUTPUT"

INVALID_WEBHOOK_CHARGE_OUTPUT="$ARTIFACT_DIR/charge-invalid-webhook.json"
invalid_webhook_charge_payload="$(jq -nc --arg order_id "$INVALID_WEBHOOK_ORDER_ID" '{order_id:$order_id,amount:11000,currency:"IDR",payment_type:"bank_transfer",bank:"bca",customer:{name:"Smoke",email:"smoke@example.com",phone:"08123456789"},items:[],callback_url:"",metadata:{source:"operational-smoke-invalid-webhook"}}')"
invalid_webhook_charge_status_code="$(curl -sS -o "$INVALID_WEBHOOK_CHARGE_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/transactions/charge" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${STORE_API_TOKEN}" \
  -H "Idempotency-Key: ${INVALID_WEBHOOK_ORDER_ID}" \
  -d "$invalid_webhook_charge_payload")"
if [[ "$invalid_webhook_charge_status_code" != "201" ]]; then
  printf 'invalid webhook setup charge failed with status %s\n' "$invalid_webhook_charge_status_code" >&2
  exit 1
fi
INVALID_PLATFORM_ORDER_ID="$(jq -r '.data.platform_order_id' "$INVALID_WEBHOOK_CHARGE_OUTPUT")"
INVALID_MIDTRANS_TRANSACTION_ID="$(jq -r '.data.midtrans.transaction_id' "$INVALID_WEBHOOK_CHARGE_OUTPUT")"

INVALID_WEBHOOK_OUTPUT="$ARTIFACT_DIR/webhook-invalid.json"
invalid_webhook_payload="$(jq -nc \
  --arg transaction_time "$(date -u '+%Y-%m-%d %H:%M:%S')" \
  --arg transaction_status "settlement" \
  --arg transaction_id "$INVALID_MIDTRANS_TRANSACTION_ID" \
  --arg status_message "midtrans payment notification" \
  --arg status_code "200" \
  --arg signature_key "invalid-signature" \
  --arg payment_type "bank_transfer" \
  --arg order_id "$INVALID_PLATFORM_ORDER_ID" \
  --arg merchant_id "GSMOKE" \
  --arg gross_amount "11000" \
  --arg fraud_status "accept" \
  --arg settlement_time "$(date -u '+%Y-%m-%d %H:%M:%S')" \
  '{transaction_time:$transaction_time,transaction_status:$transaction_status,transaction_id:$transaction_id,status_message:$status_message,status_code:$status_code,signature_key:$signature_key,payment_type:$payment_type,order_id:$order_id,merchant_id:$merchant_id,gross_amount:$gross_amount,fraud_status:$fraud_status,settlement_time:$settlement_time}')"
invalid_webhook_status_code="$(curl -sS -o "$INVALID_WEBHOOK_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/webhooks/midtrans" \
  -H 'Content-Type: application/json' \
  -d "$invalid_webhook_payload")"
if [[ "$invalid_webhook_status_code" != "401" ]]; then
  printf 'invalid webhook should return 401, got %s\n' "$invalid_webhook_status_code" >&2
  exit 1
fi
jq -e '.error.code == "WEBHOOK_SIGNATURE_INVALID"' "$INVALID_WEBHOOK_OUTPUT" >/dev/null

INVALID_TRANSACTION_OUTPUT="$ARTIFACT_DIR/transaction-invalid-webhook.json"
curl -fsS "${API_BASE_URL}/v1/transactions/${INVALID_WEBHOOK_ORDER_ID}" \
  -H "Authorization: Bearer ${STORE_API_TOKEN}" >"$INVALID_TRANSACTION_OUTPUT"
if [[ "$(jq -r '.data.status' "$INVALID_TRANSACTION_OUTPUT")" != "pending" ]]; then
  printf 'invalid webhook should not change transaction status\n' >&2
  exit 1
fi

MIDTRANS_TRANSACTION_ID="$(jq -r '.data.midtrans.transaction_id' "$CHARGE_OUTPUT")"
WEBHOOK_OUTPUT="$ARTIFACT_DIR/webhook.json"
WEBHOOK_GROSS_AMOUNT="10000"
WEBHOOK_SIGNATURE="$(printf '%s' "${PLATFORM_ORDER_ID}200${WEBHOOK_GROSS_AMOUNT}${SMOKE_MIDTRANS_SERVER_KEY}" | sha512sum | awk '{print $1}')"
webhook_payload="$(jq -nc \
  --arg transaction_time "$(date -u '+%Y-%m-%d %H:%M:%S')" \
  --arg transaction_status "settlement" \
  --arg transaction_id "$MIDTRANS_TRANSACTION_ID" \
  --arg status_message "midtrans payment notification" \
  --arg status_code "200" \
  --arg signature_key "$WEBHOOK_SIGNATURE" \
  --arg payment_type "bank_transfer" \
  --arg order_id "$PLATFORM_ORDER_ID" \
  --arg merchant_id "GSMOKE" \
  --arg gross_amount "$WEBHOOK_GROSS_AMOUNT" \
  --arg fraud_status "accept" \
  --arg settlement_time "$(date -u '+%Y-%m-%d %H:%M:%S')" \
  '{transaction_time:$transaction_time,transaction_status:$transaction_status,transaction_id:$transaction_id,status_message:$status_message,status_code:$status_code,signature_key:$signature_key,payment_type:$payment_type,order_id:$order_id,merchant_id:$merchant_id,gross_amount:$gross_amount,fraud_status:$fraud_status,settlement_time:$settlement_time}')"
webhook_status_code="$(curl -sS -o "$WEBHOOK_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/webhooks/midtrans" \
  -H 'Content-Type: application/json' \
  -d "$webhook_payload")"

if [[ "$webhook_status_code" != "200" ]]; then
  printf 'webhook failed with status %s\n' "$webhook_status_code" >&2
  exit 1
fi

if [[ "$(jq -r '.data.internal_status' "$WEBHOOK_OUTPUT")" != "paid" ]]; then
  printf 'unexpected webhook internal status\n' >&2
  exit 1
fi

TRANSACTION_OUTPUT="$ARTIFACT_DIR/transaction-after-webhook.json"
attempt=0
until curl -fsS "${API_BASE_URL}/v1/transactions/${ORDER_ID}" \
  -H "Authorization: Bearer ${STORE_API_TOKEN}" >"$TRANSACTION_OUTPUT" && \
  [[ "$(jq -r '.data.status' "$TRANSACTION_OUTPUT")" == "paid" ]]; do
  attempt=$((attempt + 1))
  if [[ "$attempt" -ge 30 ]]; then
    printf 'transaction did not become paid after webhook\n' >&2
    exit 1
  fi
  sleep 1
done

DELIVERIES_OUTPUT="$ARTIFACT_DIR/deliveries.json"
attempt=0
until curl -fsS "${API_BASE_URL}/v1/dashboard/stores/${STORE_ID}/webhook-deliveries" \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}" >"$DELIVERIES_OUTPUT" && \
  jq -e '.data.deliveries | (length >= 1 and .[0].status == "success")' "$DELIVERIES_OUTPUT" >/dev/null 2>&1 && \
  jq -e '.count >= 1 and .requests[-1].body.status == "paid" and (.requests[-1].headers["x-webhook-signature"] // "") != ""' "$CALLBACK_STATE_FILE" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [[ "$attempt" -ge 30 ]]; then
    printf 'webhook relay did not complete successfully\n' >&2
    exit 1
  fi
  sleep 1
done

DELIVERY_ID="$(jq -r '.data.deliveries[0].id' "$DELIVERIES_OUTPUT")"
if [[ -z "$DELIVERY_ID" || "$DELIVERY_ID" == "null" ]]; then
  printf 'delivery id missing\n' >&2
  exit 1
fi

psql "$BASE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "
  SET search_path TO \"${SMOKE_SCHEMA}\", public;
  UPDATE webhook_deliveries
  SET
    status = 'failed_permanently',
    attempt_count = 10,
    next_attempt_at = NULL,
    delivered_at = NULL,
    failed_at = now(),
    updated_at = now()
  WHERE id = '${DELIVERY_ID}'
" >/dev/null

MANUAL_RESEND_OUTPUT="$ARTIFACT_DIR/webhook-resend.json"
manual_resend_status_code="$(curl -sS -o "$MANUAL_RESEND_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/dashboard/webhook-deliveries/${DELIVERY_ID}/resend" \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}")"
if [[ "$manual_resend_status_code" != "202" ]]; then
  printf 'manual resend failed with status %s\n' "$manual_resend_status_code" >&2
  exit 1
fi
jq -e '.data.status == "pending"' "$MANUAL_RESEND_OUTPUT" >/dev/null

DELIVERY_DETAIL_OUTPUT="$ARTIFACT_DIR/webhook-delivery-detail.json"
attempt=0
until curl -fsS "${API_BASE_URL}/v1/dashboard/webhook-deliveries/${DELIVERY_ID}" \
  -H "Authorization: Bearer ${DASHBOARD_ACCESS_TOKEN}" >"$DELIVERY_DETAIL_OUTPUT" && \
  jq -e '.data.delivery.status == "success" and (.data.attempts | length >= 2)' "$DELIVERY_DETAIL_OUTPUT" >/dev/null 2>&1 && \
  jq -e '.count >= 2 and .requests[-1].body.status == "paid" and (.requests[-1].headers["x-webhook-signature"] // "") != ""' "$CALLBACK_STATE_FILE" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [[ "$attempt" -ge 30 ]]; then
    printf 'manual resend did not complete successfully\n' >&2
    exit 1
  fi
  sleep 1
done

METRICS_OUTPUT="$ARTIFACT_DIR/metrics-summary.txt"
api_metrics="$(curl -fsS "${API_BASE_URL}/metrics")"
worker_metrics="$(curl -fsS "$WORKER_METRICS_URL")"

printf '%s\n' "$api_metrics" | rg 'payment_platform_charge_requests_total\{result="success"\} [1-9]' >/dev/null
printf '%s\n' "$api_metrics" | rg 'payment_platform_webhook_inbound_total\{result="accepted"\} [1-9]' >/dev/null
printf '%s\n' "$worker_metrics" | rg 'payment_platform_webhook_deliveries_total\{outcome="success"\} [1-9]' >/dev/null

{
  printf 'api metrics verified\n'
  printf 'worker metrics verified\n'
} >"$METRICS_OUTPUT"

SECOND_REGISTER_OUTPUT="$ARTIFACT_DIR/register-second.json"
second_register_payload="$(jq -nc --arg name "Smoke Runner Second" --arg email "$SECOND_EMAIL" --arg password "$INITIAL_PASSWORD" '{name:$name,email:$email,password:$password}')"
second_register_status_code="$(curl -sS -o "$SECOND_REGISTER_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/dashboard/auth/register" \
  -H 'Content-Type: application/json' \
  -d "$second_register_payload")"
if [[ "$second_register_status_code" != "201" ]]; then
  printf 'second user registration failed with status %s\n' "$second_register_status_code" >&2
  exit 1
fi
SECOND_DASHBOARD_ACCESS_TOKEN="$(jq -r '.data.tokens.access_token' "$SECOND_REGISTER_OUTPUT")"

SECOND_STORE_OUTPUT="$ARTIFACT_DIR/store-second.json"
second_store_payload="$(jq -nc --arg name "Smoke Store Second" --arg slug "$SECOND_STORE_SLUG" --arg callback "$CALLBACK_URL" '{name:$name,slug:$slug,domain:"",default_callback_url:$callback}')"
second_store_status_code="$(curl -sS -o "$SECOND_STORE_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/dashboard/stores" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${SECOND_DASHBOARD_ACCESS_TOKEN}" \
  -d "$second_store_payload")"
if [[ "$second_store_status_code" != "201" ]]; then
  printf 'second store creation failed with status %s\n' "$second_store_status_code" >&2
  exit 1
fi
SECOND_STORE_ID="$(jq -r '.data.id' "$SECOND_STORE_OUTPUT")"

SECOND_TOKEN_OUTPUT="$ARTIFACT_DIR/token-second-user.json"
second_user_token_payload="$(jq -nc '{name:"Second User Token",scopes:["transaction:create","transaction:read"]}')"
second_user_token_status_code="$(curl -sS -o "$SECOND_TOKEN_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/dashboard/stores/${SECOND_STORE_ID}/api-tokens" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${SECOND_DASHBOARD_ACCESS_TOKEN}" \
  -d "$second_user_token_payload")"
if [[ "$second_user_token_status_code" != "201" ]]; then
  printf 'second user token creation failed with status %s\n' "$second_user_token_status_code" >&2
  exit 1
fi
SECOND_STORE_API_TOKEN="$(jq -r '.data.token' "$SECOND_TOKEN_OUTPUT")"

ISOLATION_STORE_OUTPUT="$ARTIFACT_DIR/isolation-store.json"
isolation_store_status_code="$(curl -sS -o "$ISOLATION_STORE_OUTPUT" -w '%{http_code}' "${API_BASE_URL}/v1/dashboard/stores/${STORE_ID}" \
  -H "Authorization: Bearer ${SECOND_DASHBOARD_ACCESS_TOKEN}")"
if [[ "$isolation_store_status_code" != "404" ]]; then
  printf 'second user should not access first store, got status %s\n' "$isolation_store_status_code" >&2
  exit 1
fi

ISOLATION_TRANSACTION_OUTPUT="$ARTIFACT_DIR/isolation-transaction.json"
isolation_transaction_status_code="$(curl -sS -o "$ISOLATION_TRANSACTION_OUTPUT" -w '%{http_code}' "${API_BASE_URL}/v1/transactions/${ORDER_ID}" \
  -H "Authorization: Bearer ${SECOND_STORE_API_TOKEN}")"
if [[ "$isolation_transaction_status_code" != "404" ]]; then
  printf 'second store token should not access first transaction, got status %s\n' "$isolation_transaction_status_code" >&2
  exit 1
fi

deactivate_store_status_code="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE "${API_BASE_URL}/v1/dashboard/stores/${SECOND_STORE_ID}" \
  -H "Authorization: Bearer ${SECOND_DASHBOARD_ACCESS_TOKEN}")"
if [[ "$deactivate_store_status_code" != "204" ]]; then
  printf 'store deactivation failed with status %s\n' "$deactivate_store_status_code" >&2
  exit 1
fi

DEACTIVATED_STORE_CHARGE_OUTPUT="$ARTIFACT_DIR/charge-deactivated-store.json"
deactivated_store_charge_payload="$(jq -nc --arg order_id "deactivated-$(date +%s)" '{order_id:$order_id,amount:10000,currency:"IDR",payment_type:"bank_transfer",bank:"bca",customer:{name:"Smoke",email:"smoke@example.com",phone:"08123456789"},items:[],callback_url:"",metadata:{source:"operational-smoke-deactivated-store"}}')"
deactivated_store_charge_status_code="$(curl -sS -o "$DEACTIVATED_STORE_CHARGE_OUTPUT" -w '%{http_code}' -X POST "${API_BASE_URL}/v1/transactions/charge" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${SECOND_STORE_API_TOKEN}" \
  -H "Idempotency-Key: deactivated-store" \
  -d "$deactivated_store_charge_payload")"
if [[ "$deactivated_store_charge_status_code" != "403" ]]; then
  printf 'deactivated store charge should return 403, got %s\n' "$deactivated_store_charge_status_code" >&2
  exit 1
fi
jq -e '.error.code == "STORE_INACTIVE"' "$DEACTIVATED_STORE_CHARGE_OUTPUT" >/dev/null

jq -nc \
  --arg artifact_dir "$ARTIFACT_DIR" \
  --arg store_id "$STORE_ID" \
  --arg second_store_id "$SECOND_STORE_ID" \
  --arg transaction_id "$TRANSACTION_ID" \
  --arg order_id "$ORDER_ID" \
  --arg platform_order_id "$PLATFORM_ORDER_ID" \
  --arg initial_status "$INITIAL_STATUS" \
  --arg final_status "$(jq -r '.data.status' "$TRANSACTION_OUTPUT")" \
  --arg relay_status "$(jq -r '.data.deliveries[0].status' "$DELIVERIES_OUTPUT")" \
  --arg callback_count "$(jq -r '.count' "$CALLBACK_STATE_FILE")" \
  --arg delivery_id "$DELIVERY_ID" \
  '{
    artifact_dir: $artifact_dir,
    store_id: $store_id,
    second_store_id: $second_store_id,
    transaction_id: $transaction_id,
    order_id: $order_id,
    platform_order_id: $platform_order_id,
    initial_status: $initial_status,
    final_status: $final_status,
    relay_status: $relay_status,
    callback_count: ($callback_count | tonumber),
    delivery_id: $delivery_id,
    checks: {
      auth_lifecycle: true,
      store_admin: true,
      token_lifecycle: true,
      idempotency_replay: true,
      idempotency_conflict: true,
      invalid_webhook_rejected: true,
      webhook_signed_delivery: true,
      manual_resend: true,
      cross_store_isolation: true,
      deactivated_store_blocked: true
    }
  }'
