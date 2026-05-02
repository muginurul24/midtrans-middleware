DROP INDEX IF EXISTS user_sessions_mfa_verified_idx;

ALTER TABLE user_sessions
  DROP COLUMN IF EXISTS mfa_verified_at,
  DROP COLUMN IF EXISTS mfa_pending_secret_ciphertext;

ALTER TABLE users
  DROP COLUMN IF EXISTS mfa_totp_enabled_at,
  DROP COLUMN IF EXISTS mfa_totp_secret_ciphertext;
