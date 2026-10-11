ALTER TABLE tickets ADD COLUMN quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 6);
ALTER TABLE payment_transactions ADD COLUMN payment_url text;
CREATE TABLE ui_holds (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 user_id text NOT NULL REFERENCES users(id), trip_id text NOT NULL REFERENCES trips(id),
 seat_ids jsonb NOT NULL, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 6),
 price numeric(12,2) NOT NULL CHECK(price>0), expires_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','released','converted')),
 boarding_stop_id text REFERENCES bus_stops(id), alighting_stop_id text REFERENCES bus_stops(id)
);
CREATE TABLE vouchers (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, code text UNIQUE NOT NULL,
 percent integer NOT NULL CHECK(percent BETWEEN 1 AND 100), expires_at timestamptz NOT NULL,
 active boolean NOT NULL DEFAULT true
);
CREATE TABLE ui_bookings (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 hold_id text UNIQUE NOT NULL REFERENCES ui_holds(id),
 name text NOT NULL, phone text NOT NULL, total numeric(12,2) NOT NULL CHECK(total>0),
 discount numeric(12,2) NOT NULL DEFAULT 0, voucher text,
 ticket_id text UNIQUE REFERENCES tickets(id), created_at timestamptz NOT NULL DEFAULT NOW(),
 invoice_requested boolean NOT NULL DEFAULT false
);
CREATE TABLE trip_locations (
 trip_id text PRIMARY KEY REFERENCES trips(id) ON DELETE CASCADE,
 latitude numeric NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude numeric NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 speed numeric, heading numeric, updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE audit_events (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 user_id text REFERENCES users(id), action text NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE trip_subscriptions(user_id text REFERENCES users(id),trip_id text REFERENCES trips(id) ON DELETE CASCADE,PRIMARY KEY(user_id,trip_id));
CREATE TABLE staff_profiles(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,user_id text UNIQUE NOT NULL REFERENCES users(id),name text NOT NULL,phone text NOT NULL);
CREATE TABLE support_requests(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,user_id text NOT NULL REFERENCES users(id),subject text NOT NULL,message text NOT NULL,rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),reply text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT NOW());
CREATE TABLE eligibility_applications(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,user_id text NOT NULL REFERENCES users(id),category text NOT NULL,document text NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')));
CREATE UNIQUE INDEX eligibility_pending_user ON eligibility_applications(user_id) WHERE status='pending';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('ADMIN','MANAGER','DRIVER','PASSENGER','FINANCE'));
INSERT INTO roles(id,name) VALUES(5,'FINANCE') ON CONFLICT(name) DO NOTHING;
SELECT setval(pg_get_serial_sequence('roles','id'),(SELECT max(id) FROM roles));
CREATE TABLE ticket_requests(ticket_id text PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,kind text NOT NULL CHECK(kind IN ('cancel','exchange')),target_trip_id text REFERENCES trips(id),created_at timestamptz NOT NULL DEFAULT NOW());
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['ui_holds','ui_bookings','vouchers','trip_locations','audit_events','trip_subscriptions','staff_profiles','support_requests','eligibility_applications','ticket_requests'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',tbl);
  EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',tbl);
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON %I FROM anon',tbl); END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON %I FROM authenticated',tbl); END IF;
 END LOOP;
END $$;
CREATE INDEX ui_holds_active_idx ON ui_holds(trip_id,expires_at) WHERE status='active';
