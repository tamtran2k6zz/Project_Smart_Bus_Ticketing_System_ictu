-- Add the PostgreSQL reservation and external-payment ledger used by Express.
ALTER TABLE tickets
  ADD COLUMN reservation_expires_at timestamptz;

ALTER TABLE trip_seats
  ADD COLUMN redis_lock_id text;

CREATE TABLE payment_transactions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ticket_id text NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  order_id text NOT NULL UNIQUE,
  payment_method text NOT NULL CHECK (payment_method IN ('VNPAY', 'MOMO')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  gateway_transaction_id text,
  refund_request_id text UNIQUE,
  redis_lock_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_status
  ON payment_transactions(status);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON payment_transactions FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON payment_transactions FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON payment_transactions FROM authenticated;
  END IF;
END $$;
