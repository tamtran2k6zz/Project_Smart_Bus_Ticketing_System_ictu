-- Additive recovery fields; raw reset tokens are never persisted.
ALTER TABLE users
 ADD COLUMN password_reset_token_hash text,
 ADD COLUMN password_reset_expires_at timestamptz,
 ADD COLUMN password_reset_sent_at timestamptz,
 ADD COLUMN password_reset_window_started_at timestamptz,
 ADD COLUMN password_reset_send_count integer NOT NULL DEFAULT 0,
 ADD COLUMN auth_version integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX users_password_reset_token ON users(password_reset_token_hash)
 WHERE password_reset_token_hash IS NOT NULL;
