ALTER TABLE users DROP CONSTRAINT users_discount_type_check;
ALTER TABLE users ADD CONSTRAINT users_discount_type_check CHECK(discount_type IN ('NONE','STUDENT','ELDERLY','WORKER','DISABLED'));
CREATE TABLE fare_policies (
 category text PRIMARY KEY CHECK(category IN ('NONE','STUDENT','ELDERLY','WORKER','DISABLED')),
 ticket_discount_percent integer NOT NULL CHECK(ticket_discount_percent BETWEEN 0 AND 80),
 monthly_price integer NOT NULL CHECK(monthly_price BETWEEN 1000 AND 10000000),
 updated_at timestamptz NOT NULL DEFAULT NOW()
);
-- Initial configurable prices; operators must approve their own fare policy before production.
INSERT INTO fare_policies VALUES('NONE',0,250000,NOW()),('STUDENT',30,150000,NOW()),('ELDERLY',30,150000,NOW()),('WORKER',10,200000,NOW()),('DISABLED',50,125000,NOW());
ALTER TABLE fare_policies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fare_policies FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON fare_policies FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON fare_policies FROM authenticated; END IF;
END $$;

