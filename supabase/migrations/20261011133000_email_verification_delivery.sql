ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
ALTER TABLE users ADD COLUMN verification_token_hash text UNIQUE;
ALTER TABLE users ADD COLUMN verification_expires_at timestamptz;
ALTER TABLE users ADD COLUMN verification_sent_at timestamptz;
ALTER TABLE users ADD COLUMN verification_window_started_at timestamptz;
ALTER TABLE users ADD COLUMN verification_send_count integer NOT NULL DEFAULT 0;

CREATE TABLE ticket_email_deliveries (
 ticket_id text PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','skipped','failed')),
 attempts integer NOT NULL DEFAULT 0,
 claimed_at timestamptz, sent_at timestamptz,
 next_attempt_at timestamptz NOT NULL DEFAULT NOW()
);
ALTER TABLE ticket_email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ticket_email_deliveries FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON ticket_email_deliveries FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON ticket_email_deliveries FROM authenticated; END IF;
END $$;
CREATE INDEX ticket_email_pending_idx ON ticket_email_deliveries(next_attempt_at) WHERE status IN ('pending','processing');
