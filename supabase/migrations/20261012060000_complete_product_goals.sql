-- Additive migration; no customer data or credentials.
ALTER TABLE trips ADD COLUMN conductor_id text REFERENCES users(id);
ALTER TABLE trips ADD COLUMN delay_minutes integer NOT NULL DEFAULT 0 CHECK(delay_minutes BETWEEN 0 AND 1440);
ALTER TABLE trip_subscriptions ADD COLUMN boarding_stop_id text REFERENCES bus_stops(id);
ALTER TABLE trip_subscriptions ADD COLUMN alighting_stop_id text REFERENCES bus_stops(id);
ALTER TABLE audit_events ADD COLUMN method text;
ALTER TABLE audit_events ADD COLUMN path text;
ALTER TABLE audit_events ADD COLUMN status_code integer;
ALTER TABLE audit_events ADD COLUMN ip text;
ALTER TABLE support_requests ADD COLUMN trip_id text REFERENCES trips(id);
CREATE TABLE monthly_passes (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 user_id text NOT NULL REFERENCES users(id), route_id text NOT NULL REFERENCES routes(id),
 starts_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 price integer NOT NULL CHECK(price>0), qr_secret text NOT NULL,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
 UNIQUE(user_id,route_id), CHECK(expires_at>starts_at)
);
CREATE TABLE pass_orders (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 user_id text NOT NULL REFERENCES users(id), route_id text NOT NULL REFERENCES routes(id),
 pass_id text REFERENCES monthly_passes(id), amount integer NOT NULL CHECK(amount>0),
 payment_method text NOT NULL CHECK(payment_method IN ('MOMO','VNPAY','ZALOPAY')),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SUCCESS','FAILED','REFUNDED')),
 payment_url text, gateway_transaction_id text, created_at timestamptz NOT NULL DEFAULT NOW(), paid_at timestamptz
);
CREATE UNIQUE INDEX pass_pending_route ON pass_orders(user_id,route_id) WHERE status='PENDING';
CREATE TABLE pass_checkins (
 pass_id text NOT NULL REFERENCES monthly_passes(id), trip_id text NOT NULL REFERENCES trips(id),
 scanned_by text NOT NULL REFERENCES users(id), seat_number text, created_at timestamptz NOT NULL DEFAULT NOW(),
 PRIMARY KEY(pass_id,trip_id)
);
CREATE TABLE schedule_templates (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, name text NOT NULL,
 route_id text NOT NULL REFERENCES routes(id), config jsonb NOT NULL,
 created_by text NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT NOW()
);
ALTER TABLE trips ADD COLUMN schedule_id text REFERENCES schedule_templates(id);
CREATE TABLE refund_jobs (
 ticket_id text PRIMARY KEY REFERENCES tickets(id), request_id text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','done')),
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT NOW(),
 leased_until timestamptz, last_error text, created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE electronic_invoices (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 booking_id text NOT NULL UNIQUE REFERENCES ui_bookings(id),
 number text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','issued')),
 kind text NOT NULL CHECK(kind IN ('demo','provider')), provider_reference text,
 document_url text, email_sent_at timestamptz, payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT NOW()
);
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('ADMIN','MANAGER','DRIVER','PASSENGER','FINANCE','MARKETING'));
INSERT INTO roles(name) VALUES('MARKETING') ON CONFLICT(name) DO NOTHING;
ALTER TABLE payment_transactions DROP CONSTRAINT payment_transactions_payment_method_check;
ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_payment_method_check CHECK(payment_method IN ('MOMO','VNPAY','QR','ZALOPAY'));
CREATE TABLE zalopay_orders (
 app_trans_id text PRIMARY KEY, order_id text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT NOW()
);
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['monthly_passes','pass_orders','pass_checkins','schedule_templates','refund_jobs','electronic_invoices','zalopay_orders'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',tbl);
  EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',tbl);
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON %I FROM anon',tbl); END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON %I FROM authenticated',tbl); END IF;
 END LOOP;
END $$;
CREATE INDEX audit_events_time ON audit_events(created_at DESC);
CREATE INDEX refund_jobs_pending ON refund_jobs(next_attempt_at) WHERE status<>'done';

