ALTER TABLE payment_transactions DROP CONSTRAINT payment_transactions_payment_method_check;
ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_payment_method_check
 CHECK(payment_method IN ('MOMO','VNPAY','QR','ZALOPAY','BANK_TRANSFER'));
CREATE TABLE bank_transfer_payments (
 ticket_id text PRIMARY KEY REFERENCES payment_transactions(ticket_id),
 booking_id text NOT NULL REFERENCES ui_bookings(id),
 reference text NOT NULL UNIQUE, bank_bin text NOT NULL, bank_name text NOT NULL,
 account_number text NOT NULL, account_holder text NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SUBMITTED','CONFIRMED','REFUNDED','REJECTED')),
 submitted_at timestamptz, sender_reference varchar(150),
 bank_transaction_id varchar(150) UNIQUE, received_amount integer CHECK(received_amount>0),
 reviewed_by text REFERENCES users(id), reviewed_at timestamptz, review_note varchar(500),
 created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX bank_transfer_review ON bank_transfer_payments(created_at) WHERE status IN ('PENDING','SUBMITTED');
ALTER TABLE bank_transfer_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON bank_transfer_payments FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON bank_transfer_payments FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON bank_transfer_payments FROM authenticated; END IF;
END $$;
