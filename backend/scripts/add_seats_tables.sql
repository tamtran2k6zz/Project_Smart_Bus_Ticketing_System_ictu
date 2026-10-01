-- HISTORICAL MYSQL ONLY. Use supabase/migrations for the deployed PostgreSQL API.
-- =============================================================================
-- SMART BUS TICKETING SYSTEM — MIGRATION: SEATS & TRIP_SEATS
-- Tác giả: La Công Tuấn
-- Mô tả: Thiết kế bảng cấu hình ghế (seats) & trạng thái ghế theo chuyến (trip_seats)
-- =============================================================================

USE `smartbus_db`;

-- 1. BẢNG SEATS (Sơ đồ danh mục cấu hình ghế theo xe buýt)
CREATE TABLE IF NOT EXISTS `seats` (
  `id` VARCHAR(36) PRIMARY KEY,
  `bus_id` VARCHAR(36) NOT NULL,
  `seat_number` VARCHAR(10) NOT NULL,
  `seat_type` VARCHAR(20) DEFAULT 'STANDARD',
  `row_position` VARCHAR(20) DEFAULT 'WINDOW',
  `deck` VARCHAR(20) DEFAULT 'DECK_1',
  `is_priority` BOOLEAN DEFAULT FALSE,
  `status` VARCHAR(20) DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_seats_bus` FOREIGN KEY (`bus_id`) REFERENCES `buses`(`id`) ON DELETE CASCADE,
  CONSTRAINT `uq_seats_bus_seat_number` UNIQUE (`bus_id`, `seat_number`),
  INDEX `idx_seats_bus_id` (`bus_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BẢNG TRIP_SEATS (Trạng thái ghế theo từng chuyến xe vận hành)
CREATE TABLE IF NOT EXISTS `trip_seats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `trip_id` INT NOT NULL,
  `seat_id` VARCHAR(36) NULL,
  `seat_number` VARCHAR(10) NOT NULL,
  `status` ENUM('AVAILABLE', 'LOCKED', 'BOOKED', 'CHECKED_IN') DEFAULT 'AVAILABLE',
  `locked_at` DATETIME NULL,
  `locked_by_user_id` INT NULL,
  `lock_expires_at` DATETIME NULL,
  `ticket_id` VARCHAR(36) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_trip_seats_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_trip_seats_seat` FOREIGN KEY (`seat_id`) REFERENCES `seats`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_trip_seats_user` FOREIGN KEY (`locked_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_trip_seats_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE SET NULL,
  CONSTRAINT `uq_trip_seats_trip_number` UNIQUE (`trip_id`, `seat_number`),
  INDEX `idx_trip_seats_trip_status` (`trip_id`, `status`),
  INDEX `idx_trip_seats_lock_expires` (`lock_expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
