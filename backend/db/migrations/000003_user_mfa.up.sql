ALTER TABLE users
  ADD COLUMN mfa_totp_secret_ciphertext TEXT,
  ADD COLUMN mfa_totp_enabled_at TIMESTAMPTZ;

ALTER TABLE user_sessions
  ADD COLUMN mfa_pending_secret_ciphertext TEXT,
  ADD COLUMN mfa_verified_at TIMESTAMPTZ;

CREATE INDEX user_sessions_mfa_verified_idx ON user_sessions(user_id, mfa_verified_at);
