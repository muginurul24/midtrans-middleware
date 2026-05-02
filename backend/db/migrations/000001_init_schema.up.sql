CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stores (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT,
  default_callback_url TEXT,
  webhook_secret_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE store_api_tokens (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  token_prefix TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  order_id TEXT NOT NULL,
  platform_order_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT,
  midtrans_transaction_id TEXT,
  payment_type TEXT NOT NULL,
  gross_amount BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  status TEXT NOT NULL DEFAULT 'created',
  fraud_status TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  callback_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  raw_request JSONB NOT NULL DEFAULT '{}',
  midtrans_request JSONB NOT NULL DEFAULT '{}',
  midtrans_response JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  UNIQUE(store_id, order_id)
);

CREATE TABLE transaction_events (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  event_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  source TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  store_id UUID REFERENCES stores(id),
  transaction_id UUID REFERENCES transactions(id),
  request_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  direction TEXT NOT NULL,
  method TEXT,
  url TEXT,
  status_code INT,
  request_headers JSONB NOT NULL DEFAULT '{}',
  request_body JSONB NOT NULL DEFAULT '{}',
  response_headers JSONB NOT NULL DEFAULT '{}',
  response_body JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE midtrans_webhooks (
  id UUID PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id),
  platform_order_id TEXT,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  transaction_status TEXT,
  fraud_status TEXT,
  payment_type TEXT,
  gross_amount TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  transaction_id UUID REFERENCES transactions(id),
  midtrans_webhook_id UUID REFERENCES midtrans_webhooks(id),
  callback_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE webhook_delivery_attempts (
  id UUID PRIMARY KEY,
  webhook_delivery_id UUID NOT NULL REFERENCES webhook_deliveries(id),
  attempt_number INT NOT NULL,
  request_headers JSONB NOT NULL DEFAULT '{}',
  request_body JSONB NOT NULL DEFAULT '{}',
  response_status INT,
  response_body TEXT,
  error_message TEXT,
  duration_ms INT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

