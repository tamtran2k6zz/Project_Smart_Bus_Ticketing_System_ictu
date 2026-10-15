-- Wallet ownership is established by the authenticated API; bank details belong to each payout.
ALTER TABLE user_wallets ALTER COLUMN date_of_birth DROP NOT NULL;
ALTER TABLE user_wallets ALTER COLUMN citizen_id DROP NOT NULL;
ALTER TABLE user_wallets ALTER COLUMN bank_name DROP NOT NULL;
ALTER TABLE user_wallets ALTER COLUMN bank_account_number DROP NOT NULL;
ALTER TABLE user_wallets ALTER COLUMN balance SET NOT NULL;
ALTER TABLE user_wallets ALTER COLUMN status SET NOT NULL;
ALTER TABLE user_wallets ADD CONSTRAINT wallet_integer_balance CHECK(balance=trunc(balance));
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_positive_integer_amount CHECK(amount>0 AND amount=trunc(amount));
CREATE UNIQUE INDEX wallet_ledger_reference ON wallet_transactions(wallet_id,type,reference_id) WHERE reference_id IS NOT NULL;
CREATE TABLE wallet_topups (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 user_id text NOT NULL REFERENCES users(id),
 amount integer NOT NULL CHECK(amount BETWEEN 10000 AND 10000000),
 method text NOT NULL CHECK(method IN ('MOMO','VNPAY','ZALOPAY')),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SUCCESS','FAILED')),
 request_key text NOT NULL, payment_url text, gateway_transaction_id text,
 created_at timestamptz NOT NULL DEFAULT NOW(), paid_at timestamptz,
 UNIQUE(user_id,request_key), UNIQUE(method,gateway_transaction_id)
);
CREATE TABLE wallet_withdrawals (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 user_id text NOT NULL REFERENCES users(id),
 amount integer NOT NULL CHECK(amount BETWEEN 10000 AND 10000000),
 bank_name varchar(100) NOT NULL, bank_account_number varchar(34) NOT NULL,
 account_holder_name varchar(100) NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PAID','REJECTED')),
 request_key text NOT NULL, bank_reference varchar(150), review_note varchar(500),
 reviewed_by text REFERENCES users(id), reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT NOW(), UNIQUE(user_id,request_key)
);
CREATE UNIQUE INDEX wallet_unique_bank_reference ON wallet_withdrawals(bank_reference) WHERE status='PAID';
CREATE INDEX wallet_pending_withdrawals ON wallet_withdrawals(created_at) WHERE status='PENDING';
ALTER TABLE pass_orders DROP CONSTRAINT pass_orders_payment_method_check;
ALTER TABLE pass_orders ADD CONSTRAINT pass_orders_payment_method_check CHECK(payment_method IN ('MOMO','VNPAY','ZALOPAY','WALLET'));
ALTER TABLE pass_orders ADD COLUMN wallet_request_key text;
CREATE UNIQUE INDEX pass_wallet_request ON pass_orders(user_id,wallet_request_key) WHERE wallet_request_key IS NOT NULL;
CREATE TABLE wallet_pass_subscriptions (
 user_id text NOT NULL REFERENCES users(id), route_id text NOT NULL REFERENCES routes(id),
 enabled boolean NOT NULL DEFAULT false, max_amount integer NOT NULL CHECK(max_amount BETWEEN 1000 AND 10000000),
 next_attempt_at timestamptz NOT NULL DEFAULT NOW(),
 last_result text, updated_at timestamptz NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,route_id)
);
CREATE INDEX wallet_subscription_due ON wallet_pass_subscriptions(next_attempt_at) WHERE enabled;
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['user_wallets','wallet_transactions','wallet_topups','wallet_withdrawals','wallet_pass_subscriptions'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',tbl);
  EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',tbl);
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON %I FROM anon',tbl); END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON %I FROM authenticated',tbl); END IF;
 END LOOP;
END $$;
