CREATE TABLE alert_endpoints (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'webhook',
  destination_url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['webhook.failed_permanently'],
  status TEXT NOT NULL DEFAULT 'active',
  auth_token_encrypted TEXT,
  last_tested_at TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_endpoints_user_id ON alert_endpoints(user_id);
CREATE INDEX idx_alert_endpoints_status ON alert_endpoints(status);

CREATE TABLE alert_deliveries (
  id UUID PRIMARY KEY,
  alert_endpoint_id UUID NOT NULL REFERENCES alert_endpoints(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id),
  source_delivery_id UUID REFERENCES webhook_deliveries(id),
  source_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INT,
  response_body TEXT,
  error_message TEXT,
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_deliveries_endpoint_id ON alert_deliveries(alert_endpoint_id);
CREATE INDEX idx_alert_deliveries_source_delivery_id ON alert_deliveries(source_delivery_id);
CREATE INDEX idx_alert_deliveries_status ON alert_deliveries(status);
