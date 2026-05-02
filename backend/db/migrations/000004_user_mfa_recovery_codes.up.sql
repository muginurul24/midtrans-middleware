CREATE TABLE user_mfa_recovery_codes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_mfa_recovery_codes_user_id_idx ON user_mfa_recovery_codes(user_id);
CREATE INDEX user_mfa_recovery_codes_user_active_idx ON user_mfa_recovery_codes(user_id, used_at);
