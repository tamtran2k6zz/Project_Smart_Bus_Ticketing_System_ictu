-- =============================================================================
-- Sprint 3 — Soát vé QR: tickets + ticket_validation_logs + composite indexes
--
-- Script độc lập, idempotent (chạy lại được) cho Sprint 3. Cung cấp:
--   * bảng `tickets`                — vé điện tử (khớp cấu trúc ở
--     supabase/migrations/20261001031604_smartbus_postgres.sql, thêm
--     IF NOT EXISTS để an toàn trên database đã tồn tại).
--   * bảng `ticket_validation_logs` — kiểm toán mọi lần soát vé QR
--     (VALID / ALREADY_USED / REJECTED) — US 15.
--   * chỉ mục tổng hợp:
--       idx_tickets_validation ON tickets (ticket_code, status)
--       idx_ticket_logs_audit  ON ticket_validation_logs (ticket_id, created_at DESC)
--
-- Nguồn áp dụng chính của dự án vẫn là backend/scripts/migrate-postgres.cjs
-- (đọc supabase/migrations/*.sql theo checksum). File này là bản sao tham
-- chiếu để provision độc lập / đối chiếu schema:
--   psql "$DATABASE_URL" -f migrations/sprint3_schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. tickets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  id          text PRIMARY KEY,
  ticket_code VARCHAR(50) UNIQUE,
  trip_id     text NOT NULL,
  status      text CHECK (status IN ('RESERVED','BOOKED','CHECKED_IN','CANCELLED')) DEFAULT 'BOOKED',
  seat_number VARCHAR(10) NULL,
  user_id     text NULL,
  fare_amount DECIMAL(10,2) DEFAULT 10000.00,
  created_at  timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tickets_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_tickets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Composite index cho luồng soát vé: tra cứu theo ticket_code kèm trạng thái
-- (POST /api/v1/tickets/validate-qr: WHERE ticket_code=$1 + phán định status).
CREATE INDEX IF NOT EXISTS idx_tickets_validation
  ON tickets (ticket_code, status);

-- ---------------------------------------------------------------------------
-- 2. ticket_validation_logs — kiểm toán soát vé QR
-- ---------------------------------------------------------------------------
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

-- Composite index cho audit: lịch sử soát của từng vé theo thời gian
-- (bao phủ luôn truy vấn theo ticket_id nhờ prefix, nên không cần thêm
-- idx_validation_logs_ticket riêng trong file này).
CREATE INDEX IF NOT EXISTS idx_ticket_logs_audit
  ON ticket_validation_logs (ticket_id, created_at DESC);

-- Các chỉ mục truy vấn còn lại của Sprint 3 (khớp supabase/migrations).
CREATE INDEX IF NOT EXISTS idx_validation_logs_trip_created
  ON ticket_validation_logs (trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_logs_validated_by
  ON ticket_validation_logs (validated_by);
CREATE INDEX IF NOT EXISTS idx_validation_logs_created
  ON ticket_validation_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. RLS — theo pattern của 20261001031604_smartbus_postgres.sql: truy cập
--    chỉ qua service role (backend kết nối bằng owner), anon/authenticated
--    bị REVOKE toàn bộ.
-- ---------------------------------------------------------------------------
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_validation_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON tickets FROM PUBLIC;
REVOKE ALL ON ticket_validation_logs FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON tickets FROM anon;
    REVOKE ALL ON ticket_validation_logs FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON tickets FROM authenticated;
    REVOKE ALL ON ticket_validation_logs FROM authenticated;
  END IF;
END $$;
