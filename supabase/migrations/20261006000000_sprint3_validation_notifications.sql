-- =============================================================================
-- Sprint 3 — Soát vé QR, Thông báo & Device Token
--
-- 1. ticket_validation_logs : kiểm toán mọi lần soát vé QR (VALID /
--    ALREADY_USED / REJECTED) — US 15.
-- 2. user_devices           : device token push (FCM) cho hành khách — US 10.
-- 3. notifications          : thông báo (xe sắp đến trạm, ...) — US 10.
--
-- Migrations được nạp tuần tự bởi backend/scripts/migrate-postgres.cjs và
-- backend/scripts/test-postgres.cjs (mọi tệp *.sql trong thư mục này).
-- DDL idempotent để chạy lại được. RLS bật theo đúng pattern của
-- 20261001031604_smartbus_postgres.sql: truy cập chỉ qua service role,
-- anon/authenticated bị REVOKE toàn bộ.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ticket_validation_logs (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ticket_id     TEXT NOT NULL REFERENCES tickets (id) ON DELETE CASCADE,
  trip_id       TEXT NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  validated_by  TEXT REFERENCES users (id) ON DELETE SET NULL,
  stop_id       TEXT REFERENCES bus_stops (id) ON DELETE SET NULL,
  result        VARCHAR(20) NOT NULL CHECK (result IN ('VALID', 'ALREADY_USED', 'REJECTED')),
  reason        VARCHAR(255),
  latitude      NUMERIC(10, 7),
  longitude     NUMERIC(10, 7),
  qr_code_hash  VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_logs_ticket
  ON ticket_validation_logs (ticket_id);
CREATE INDEX IF NOT EXISTS idx_validation_logs_trip_created
  ON ticket_validation_logs (trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_logs_validated_by
  ON ticket_validation_logs (validated_by);
CREATE INDEX IF NOT EXISTS idx_validation_logs_created
  ON ticket_validation_logs (created_at DESC);

ALTER TABLE ticket_validation_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ticket_validation_logs FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ticket_validation_logs FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ticket_validation_logs FROM authenticated;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- user_devices — đăng ký device token push (FCM) cho người dùng.
-- Token là duy nhất: đăng ký lại (thiết bị mới / cài lại app) sẽ chuyển ownership.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_devices (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  device_token  VARCHAR(512) NOT NULL UNIQUE,
  platform      VARCHAR(20) NOT NULL CHECK (platform IN ('ANDROID', 'IOS', 'WEB')),
  device_name   VARCHAR(100),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user
  ON user_devices (user_id);

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON user_devices FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON user_devices FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON user_devices FROM authenticated;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- notifications — thông báo hành khách (US 10: xe sắp tiếp cận trạm, ...).
-- data là JSON payload tùy chọn cho client (tripId, stopId, ...).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        VARCHAR(500),
  data        JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON notifications FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON notifications FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON notifications FROM authenticated;
  END IF;
END $$;
