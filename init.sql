-- HISTORICAL MYSQL ONLY. The current PostgreSQL schema is in supabase/migrations/.
-- =============================================================================
-- SMART BUS TICKETING SYSTEM — SPRINT 1 DATABASE INITIALIZATION SCHEMA
-- Database: smartbus_db | MySQL 8.0 Engine | Full UTF-8 Vietnamese Support
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `smartbus_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `smartbus_db`;

-- Thiết lập bảng mã ký tự chuẩn UTF-8 Multibyte cho toàn bộ phiên kết nối
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = 'utf8mb4_unicode_ci';

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `feedbacks`;
DROP TABLE IF EXISTS `incidents`;
DROP TABLE IF EXISTS `trip_seats`;
DROP TABLE IF EXISTS `tickets`;
DROP TABLE IF EXISTS `trips`;
DROP TABLE IF EXISTS `seats`;
DROP TABLE IF EXISTS `route_stops`;
DROP TABLE IF EXISTS `bus_stops`;
DROP TABLE IF EXISTS `routes`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `buses`;
DROP TABLE IF EXISTS `fares`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. BẢNG ROLES (US 22: Phân quyền vai trò RBAC)
CREATE TABLE `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BẢNG USERS (US 22: Tài khoản & Mật khẩu mã hóa bcrypt)
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone_number` VARCHAR(20) NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` INT NOT NULL,
  `role` ENUM('ADMIN', 'MANAGER', 'DRIVER', 'PASSENGER') DEFAULT 'PASSENGER',
  `status` ENUM('ACTIVE', 'INACTIVE', 'LOCKED') DEFAULT 'ACTIVE',
  `discount_type` ENUM('NONE', 'STUDENT', 'ELDERLY') DEFAULT 'NONE',
  `discount_status` ENUM('NOT_REGISTERED', 'PENDING', 'APPROVED', 'REJECTED') DEFAULT 'NOT_REGISTERED',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BẢNG ROUTES (US 12: Tuyến xe buýt)
CREATE TABLE `routes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `distance_km` DECIMAL(6,2) DEFAULT 0.00,
  `base_price` DECIMAL(10,2) DEFAULT 10000.00,
  `estimated_duration_min` INT DEFAULT 0,
  `status` ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  `deleted_at` DATETIME(3) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BẢNG BUS_STOPS (US 12: Trạm dừng đón trả khách)
CREATE TABLE `bus_stops` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `latitude` DECIMAL(10,7) NULL,
  `longitude` DECIMAL(10,7) NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `deleted_at` DATETIME(3) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. BẢNG ROUTE_STOPS (US 12 & US 01: Liên kết Tuyến - Trạm với thứ tự)
CREATE TABLE `route_stops` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `route_id` INT NOT NULL,
  `stop_id` INT NOT NULL,
  `stop_order` INT NOT NULL,
  `distance_from_start_km` DECIMAL(6,2) DEFAULT 0.00,
  `estimated_minutes` INT DEFAULT 0,
  `estimated_time_minutes` INT GENERATED ALWAYS AS (`estimated_minutes`) STORED,
  CONSTRAINT `fk_rs_route` FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rs_stop` FOREIGN KEY (`stop_id`) REFERENCES `bus_stops`(`id`) ON DELETE CASCADE,
  CONSTRAINT `uq_route_stop_order` UNIQUE (`route_id`, `stop_order`),
  INDEX `idx_route_stops_order` (`route_id`, `stop_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BẢNG BUSES (Xe buýt vận hành)
CREATE TABLE `buses` (
  `id` VARCHAR(36) PRIMARY KEY,
  `plate_number` VARCHAR(20) NOT NULL UNIQUE,
  `bus_type` VARCHAR(50) DEFAULT 'STANDARD',
  `total_seats` INT DEFAULT 40,
  `standing_capacity` INT DEFAULT 15,
  `status` VARCHAR(50) DEFAULT 'READY',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. BẢNG SEATS (BE 1 / US 02: Sơ đồ cấu hình danh mục ghế theo xe buýt)
CREATE TABLE `seats` (
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

-- 7. BẢNG FARES (Bảng giá vé)
CREATE TABLE `fares` (
  `id` VARCHAR(36) PRIMARY KEY,
  `route_id` INT NOT NULL,
  `fareType` ENUM('FLAT_FARE','STAGE_FARE') DEFAULT 'FLAT_FARE',
  `ticket_type` ENUM('SINGLE','MONTHLY_STUDENT','MONTHLY_REGULAR','PRIORITY') DEFAULT 'SINGLE',
  `amount` DOUBLE NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. BẢNG TRIPS (US 01: Chuyến xe xuất bến theo lịch trình)
CREATE TABLE `trips` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `route_id` INT NOT NULL,
  `bus_id` VARCHAR(36) NULL,
  `bus_plate` VARCHAR(20) NOT NULL,
  `driver_id` INT NULL,
  `departure_time` DATETIME NOT NULL,
  `arrival_time` DATETIME NOT NULL,
  `total_seats` INT DEFAULT 40,
  `booked_seats` INT DEFAULT 0,
  `base_price` DECIMAL(10,2) DEFAULT 10000.00,
  `status` ENUM('SCHEDULED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED') DEFAULT 'SCHEDULED',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_trips_route` FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_trips_driver` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_trips_route_departure` (`route_id`, `departure_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. BẢNG TICKETS (Vé xe, ghế và mã QR)
CREATE TABLE `tickets` (
  `id` VARCHAR(36) PRIMARY KEY,
  `ticket_code` VARCHAR(50) UNIQUE,
  `trip_id` INT NOT NULL,
  `status` ENUM('RESERVED','BOOKED','CHECKED_IN','CANCELLED') DEFAULT 'BOOKED',
  `seat_number` VARCHAR(10) NULL,
  `user_id` INT NULL,
  `fare_amount` DECIMAL(10,2) DEFAULT 10000.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tickets_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tickets_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. BẢNG TRIP_SEATS (BE 1 / US 02 & US 03: Trạng thái ghế theo từng chuyến xe vận hành)
CREATE TABLE `trip_seats` (
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

-- 10. BẢNG INCIDENTS (Sự cố đường sá & trễ chuyến - US 11)
CREATE TABLE `incidents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `trip_id` INT NOT NULL,
  `driver_id` INT NULL,
  `incident_type` VARCHAR(50) NOT NULL,
  `severity` VARCHAR(20) DEFAULT 'MEDIUM',
  `description` TEXT NOT NULL,
  `delay_minutes` INT DEFAULT 0,
  `action_taken` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_incidents_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_incidents_driver` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. BẢNG FEEDBACKS (Đánh giá chất lượng dịch vụ của hành khách - US 24)
CREATE TABLE `feedbacks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `trip_id` INT NOT NULL,
  `user_id` INT NULL,
  `rating_stars` INT NOT NULL,
  `criteria` VARCHAR(100) NULL,
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_feedbacks_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_feedbacks_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- DỮ LIỆU KHỞI TẠO MẪU THỰC TẾ (REAL SEED DATA - NO MOCK - CHUẨN TIẾNG VIỆT UTF-8)
-- =============================================================================

-- Chèn 4 vai trò RBAC (US 22)
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'ADMIN', 'Quản trị viên toàn quyền hệ thống'),
(2, 'MANAGER', 'Quản lý điều độ tuyến, chuyến và nhân sự'),
(3, 'DRIVER', 'Tài xế lái xe, soát vé QR và báo cáo sự cố'),
(4, 'PASSENGER', 'Hành khách tra cứu tuyến, đặt vé và gửi đánh giá');

-- Chèn người dùng mẫu thực tế (Mật khẩu băm chuẩn bcrypt)
-- Admin: Admin@12345 | Manager: Manager@123 | Driver: Driver@123 | Passenger: User@123
INSERT INTO `users` (`id`, `full_name`, `email`, `phone_number`, `password_hash`, `role_id`, `role`, `status`, `discount_type`, `discount_status`) VALUES
(1, 'Hệ Thống Quản Trị Viên', 'admin@smartbus.ictu.vn', '0981112233', '$2b$10$SxDRlMRb1zVGRT6Es.lKUOZoP0D3V5ICZIu4owSCWwxlyUueYNH.S', 1, 'ADMIN', 'ACTIVE', 'NONE', 'NOT_REGISTERED'),
(2, 'Trần Điều Phối Viên', 'manager@smartbus.ictu.vn', '0982223344', '$2b$10$gXm7sd3JjOd/kANBgp3RF.l1/3b48cDBsc2ewfkI6SBHLY.ymgZgS', 2, 'MANAGER', 'ACTIVE', 'NONE', 'NOT_REGISTERED'),
(3, 'Bác tài Nguyễn Văn Lái', 'driver@smartbus.ictu.vn', '0987654321', '$2b$10$iEB9R5gMsEnmfr/Kp33yEulW3tiu./KjFey7SzcgNY7yV6hudI7/q', 3, 'DRIVER', 'ACTIVE', 'NONE', 'NOT_REGISTERED'),
(4, 'Lê Thị Hành Khách', 'khachhang@gmail.com', '0912345678', '$2b$10$osQD8TgZvL8ZCkUWwTIZyuBDec3pFo2MbGxDB3w3mOwFHBiaFxsty', 4, 'PASSENGER', 'ACTIVE', 'STUDENT', 'APPROVED');

-- Chèn 2 tuyến xe buýt thực tế (US 12)
INSERT INTO `routes` (`id`, `code`, `name`, `description`, `distance_km`, `base_price`, `status`) VALUES
(1, 'R01', 'Bến xe Mỹ Đình - Bến xe Long Biên', 'Tuyến buýt trục chính kết nối bến xe phía Tây và trung tâm Long Biên', 18.50, 10000.00, 'ACTIVE'),
(2, 'R02', 'Bến xe Yên Nghĩa - Sân bay Nội Bài', 'Tuyến buýt tốc hành kết nối bến xe phía Nam với Cảng hàng không Quốc tế Nội Bài', 38.00, 35000.00, 'ACTIVE');

-- Chèn 6 trạm dừng thực tế (US 12)
INSERT INTO `bus_stops` (`id`, `code`, `name`, `address`, `latitude`, `longitude`, `is_active`) VALUES
(1, 'BS-01', 'Bến xe Mỹ Đình', 'Số 20 Phạm Hùng, Mỹ Đình 2, Nam Từ Liêm, Hà Nội', 21.0285110, 105.7783220, 1),
(2, 'BS-02', 'Đại học Quốc gia Hà Nội', '144 Xuân Thủy, Cầu Giấy, Hà Nội', 21.0368200, 105.7825300, 1),
(3, 'BS-03', 'Trạm Cầu Giấy', 'Điểm trung chuyển xe buýt Cầu Giấy, Ngọc Khánh, Ba Đình, Hà Nội', 21.0298100, 105.8016400, 1),
(4, 'BS-04', 'Trạm Kim Mã', 'Số 1 Kim Mã, Giảng Võ, Ba Đình, Hà Nội', 21.0315200, 105.8198100, 1),
(5, 'BS-05', 'Bến xe Long Biên', 'Đường Yên Phụ, Phường Đồng Xuân, Hoàn Kiếm, Hà Nội', 21.0422300, 105.8505200, 1),
(6, 'BS-06', 'Sân bay Quốc tế Nội Bài', 'Nhà ga hành khách T1 & T2, Phú Minh, Sóc Sơn, Hà Nội', 21.2187100, 105.8042200, 1);

-- Chèn lộ trình thứ tự trạm dừng (US 12 & US 01)
-- Tuyến R01: Mỹ Đình (1) -> ĐH Quốc Gia (2) -> Cầu Giấy (3) -> Kim Mã (4) -> Long Biên (5)
INSERT INTO `route_stops` (`route_id`, `stop_id`, `stop_order`, `distance_from_start_km`, `estimated_minutes`) VALUES
(1, 1, 1, 0.00, 0),
(1, 2, 2, 2.50, 8),
(1, 3, 3, 6.00, 18),
(1, 4, 4, 11.20, 30),
(1, 5, 5, 18.50, 45);

-- Tuyến R02: Cầu Giấy (1) -> Kim Mã (2) -> Sân bay Nội Bài (3)
INSERT INTO `route_stops` (`route_id`, `stop_id`, `stop_order`, `distance_from_start_km`, `estimated_minutes`) VALUES
(2, 3, 1, 0.00, 0),
(2, 4, 2, 5.20, 15),
(2, 6, 3, 38.00, 65);

-- Chèn dữ liệu danh mục xe buýt (buses)
INSERT INTO `buses` (`id`, `plate_number`, `bus_type`, `total_seats`, `status`) VALUES
('bus-01', '29B-188.22', 'STANDARD', 40, 'READY'),
('bus-02', '29B-512.68', 'STANDARD', 40, 'READY'),
('bus-03', '29B-998.44', 'STANDARD', 40, 'READY'),
('bus-04', '29B-777.89', 'STANDARD', 45, 'READY');

-- Chèn dữ liệu giá vé cơ sở (fares)
INSERT INTO `fares` (`id`, `route_id`, `fareType`, `ticket_type`, `amount`, `is_active`) VALUES
('fare-01', 1, 'FLAT_FARE', 'SINGLE', 10000.00, 1),
('fare-02', 2, 'FLAT_FARE', 'SINGLE', 35000.00, 1);

-- Chèn các chuyến xe theo lịch trình (US 01: Hôm nay và ngày mai)
INSERT INTO `trips` (`id`, `route_id`, `bus_id`, `bus_plate`, `driver_id`, `departure_time`, `arrival_time`, `total_seats`, `booked_seats`, `status`) VALUES
(1, 1, 'bus-01', '29B-188.22', 3, CONCAT(CURDATE(), ' 06:30:00'), CONCAT(CURDATE(), ' 07:15:00'), 40, 14, 'SCHEDULED'),
(2, 1, 'bus-01', '29B-188.22', 3, CONCAT(CURDATE(), ' 08:30:00'), CONCAT(CURDATE(), ' 09:15:00'), 40, 22, 'SCHEDULED'),
(3, 1, 'bus-02', '29B-512.68', 3, CONCAT(CURDATE(), ' 11:00:00'), CONCAT(CURDATE(), ' 11:45:00'), 40, 8, 'SCHEDULED'),
(4, 1, 'bus-02', '29B-512.68', 3, CONCAT(CURDATE(), ' 14:30:00'), CONCAT(CURDATE(), ' 15:15:00'), 40, 19, 'SCHEDULED'),
(5, 1, 'bus-03', '29B-998.44', 3, CONCAT(CURDATE(), ' 17:30:00'), CONCAT(CURDATE(), ' 18:15:00'), 40, 31, 'SCHEDULED'),
(6, 1, 'bus-03', '29B-998.44', 3, CONCAT(CURDATE(), ' 20:00:00'), CONCAT(CURDATE(), ' 20:45:00'), 40, 5, 'SCHEDULED'),
(7, 2, 'bus-04', '29B-777.89', 3, CONCAT(CURDATE(), ' 07:00:00'), CONCAT(CURDATE(), ' 08:05:00'), 45, 18, 'SCHEDULED'),
(8, 2, 'bus-04', '29B-777.89', 3, CONCAT(CURDATE(), ' 10:30:00'), CONCAT(CURDATE(), ' 11:35:00'), 45, 27, 'SCHEDULED'),
(9, 2, 'bus-04', '29B-777.89', 3, CONCAT(CURDATE(), ' 15:00:00'), CONCAT(CURDATE(), ' 16:05:00'), 45, 12, 'SCHEDULED'),
(10, 1, 'bus-01', '29B-188.22', 3, DATE_ADD(CONCAT(CURDATE(), ' 07:00:00'), INTERVAL 1 DAY), DATE_ADD(CONCAT(CURDATE(), ' 07:45:00'), INTERVAL 1 DAY), 40, 0, 'SCHEDULED'),
(11, 1, 'bus-02', '29B-512.68', 3, DATE_ADD(CONCAT(CURDATE(), ' 09:30:00'), INTERVAL 1 DAY), DATE_ADD(CONCAT(CURDATE(), ' 10:15:00'), INTERVAL 1 DAY), 40, 0, 'SCHEDULED');

-- Chèn vé mẫu (US 15: Soát vé QR)
INSERT INTO `tickets` (`id`, `ticket_code`, `trip_id`, `status`, `seat_number`, `user_id`, `fare_amount`) VALUES
('tkt-001', 'TKT-ICTU-8888', 1, 'BOOKED', 'A08', 4, 10000.00),
('tkt-002', 'TKT-A01-1234', 1, 'CHECKED_IN', 'A01', 4, 10000.00);

-- Chèn báo cáo sự cố mẫu (US 11)
INSERT INTO `incidents` (`id`, `trip_id`, `driver_id`, `incident_type`, `severity`, `description`, `delay_minutes`, `created_at`) VALUES
(1, 1, 3, 'TRAFFIC_JAM', 'MEDIUM', 'Ùn tắc giao thông cục bộ tại nút giao Cầu Giấy trong giờ cao điểm sáng.', 15, NOW());

-- Chèn đánh giá mẫu (US 24)
INSERT INTO `feedbacks` (`id`, `trip_id`, `user_id`, `rating_stars`, `criteria`, `content`, `created_at`) VALUES
(1, 1, 4, 5, 'Dịch vụ & Thái độ', 'Xe buýt sạch sẽ, điều hòa mát, bác tài Nguyễn Văn Lái lái xe rất êm và đúng giờ!', NOW());

-- =============================================================================
-- CHÈN DỮ LIỆU SƠ ĐỒ GHẾ VÀ TRẠNG THÁI GHẾ THEO CHUYẾN (BE 1 - LA CÔNG TUẤN)
-- =============================================================================

-- 1. Chèn danh mục 165 ghế cố định theo cấu hình xe buýt (bảng seats)
INSERT INTO `seats` (`id`, `bus_id`, `seat_number`, `seat_type`, `row_position`, `deck`, `is_priority`, `status`) VALUES
('seat-bus-01-A01', 'bus-01', 'A01', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-01-A02', 'bus-01', 'A02', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-01-A03', 'bus-01', 'A03', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A04', 'bus-01', 'A04', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A05', 'bus-01', 'A05', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A06', 'bus-01', 'A06', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A07', 'bus-01', 'A07', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A08', 'bus-01', 'A08', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A09', 'bus-01', 'A09', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A10', 'bus-01', 'A10', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A11', 'bus-01', 'A11', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A12', 'bus-01', 'A12', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A13', 'bus-01', 'A13', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A14', 'bus-01', 'A14', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A15', 'bus-01', 'A15', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A16', 'bus-01', 'A16', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A17', 'bus-01', 'A17', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A18', 'bus-01', 'A18', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A19', 'bus-01', 'A19', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-A20', 'bus-01', 'A20', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B01', 'bus-01', 'B01', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-01-B02', 'bus-01', 'B02', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-01-B03', 'bus-01', 'B03', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B04', 'bus-01', 'B04', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B05', 'bus-01', 'B05', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B06', 'bus-01', 'B06', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B07', 'bus-01', 'B07', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B08', 'bus-01', 'B08', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B09', 'bus-01', 'B09', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B10', 'bus-01', 'B10', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B11', 'bus-01', 'B11', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B12', 'bus-01', 'B12', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B13', 'bus-01', 'B13', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B14', 'bus-01', 'B14', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B15', 'bus-01', 'B15', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B16', 'bus-01', 'B16', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B17', 'bus-01', 'B17', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B18', 'bus-01', 'B18', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B19', 'bus-01', 'B19', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-01-B20', 'bus-01', 'B20', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A01', 'bus-02', 'A01', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-02-A02', 'bus-02', 'A02', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-02-A03', 'bus-02', 'A03', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A04', 'bus-02', 'A04', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A05', 'bus-02', 'A05', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A06', 'bus-02', 'A06', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A07', 'bus-02', 'A07', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A08', 'bus-02', 'A08', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A09', 'bus-02', 'A09', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A10', 'bus-02', 'A10', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A11', 'bus-02', 'A11', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A12', 'bus-02', 'A12', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A13', 'bus-02', 'A13', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A14', 'bus-02', 'A14', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A15', 'bus-02', 'A15', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A16', 'bus-02', 'A16', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A17', 'bus-02', 'A17', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A18', 'bus-02', 'A18', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A19', 'bus-02', 'A19', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-A20', 'bus-02', 'A20', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B01', 'bus-02', 'B01', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-02-B02', 'bus-02', 'B02', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-02-B03', 'bus-02', 'B03', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B04', 'bus-02', 'B04', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B05', 'bus-02', 'B05', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B06', 'bus-02', 'B06', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B07', 'bus-02', 'B07', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B08', 'bus-02', 'B08', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B09', 'bus-02', 'B09', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B10', 'bus-02', 'B10', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B11', 'bus-02', 'B11', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B12', 'bus-02', 'B12', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B13', 'bus-02', 'B13', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B14', 'bus-02', 'B14', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B15', 'bus-02', 'B15', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B16', 'bus-02', 'B16', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B17', 'bus-02', 'B17', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B18', 'bus-02', 'B18', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B19', 'bus-02', 'B19', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-02-B20', 'bus-02', 'B20', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A01', 'bus-03', 'A01', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-03-A02', 'bus-03', 'A02', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-03-A03', 'bus-03', 'A03', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A04', 'bus-03', 'A04', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A05', 'bus-03', 'A05', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A06', 'bus-03', 'A06', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A07', 'bus-03', 'A07', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A08', 'bus-03', 'A08', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A09', 'bus-03', 'A09', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A10', 'bus-03', 'A10', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A11', 'bus-03', 'A11', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A12', 'bus-03', 'A12', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A13', 'bus-03', 'A13', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A14', 'bus-03', 'A14', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A15', 'bus-03', 'A15', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A16', 'bus-03', 'A16', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A17', 'bus-03', 'A17', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A18', 'bus-03', 'A18', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A19', 'bus-03', 'A19', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-A20', 'bus-03', 'A20', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B01', 'bus-03', 'B01', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-03-B02', 'bus-03', 'B02', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-03-B03', 'bus-03', 'B03', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B04', 'bus-03', 'B04', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B05', 'bus-03', 'B05', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B06', 'bus-03', 'B06', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B07', 'bus-03', 'B07', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B08', 'bus-03', 'B08', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B09', 'bus-03', 'B09', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B10', 'bus-03', 'B10', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B11', 'bus-03', 'B11', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B12', 'bus-03', 'B12', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B13', 'bus-03', 'B13', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B14', 'bus-03', 'B14', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B15', 'bus-03', 'B15', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B16', 'bus-03', 'B16', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B17', 'bus-03', 'B17', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B18', 'bus-03', 'B18', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B19', 'bus-03', 'B19', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-03-B20', 'bus-03', 'B20', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A01', 'bus-04', 'A01', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-04-A02', 'bus-04', 'A02', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-04-A03', 'bus-04', 'A03', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A04', 'bus-04', 'A04', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A05', 'bus-04', 'A05', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A06', 'bus-04', 'A06', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A07', 'bus-04', 'A07', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A08', 'bus-04', 'A08', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A09', 'bus-04', 'A09', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A10', 'bus-04', 'A10', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A11', 'bus-04', 'A11', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A12', 'bus-04', 'A12', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A13', 'bus-04', 'A13', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A14', 'bus-04', 'A14', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A15', 'bus-04', 'A15', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A16', 'bus-04', 'A16', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A17', 'bus-04', 'A17', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A18', 'bus-04', 'A18', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A19', 'bus-04', 'A19', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A20', 'bus-04', 'A20', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A21', 'bus-04', 'A21', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A22', 'bus-04', 'A22', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-A23', 'bus-04', 'A23', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B01', 'bus-04', 'B01', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-04-B02', 'bus-04', 'B02', 'PRIORITY', 'FRONT', 'DECK_1', 1, 'ACTIVE'),
('seat-bus-04-B03', 'bus-04', 'B03', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B04', 'bus-04', 'B04', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B05', 'bus-04', 'B05', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B06', 'bus-04', 'B06', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B07', 'bus-04', 'B07', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B08', 'bus-04', 'B08', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B09', 'bus-04', 'B09', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B10', 'bus-04', 'B10', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B11', 'bus-04', 'B11', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B12', 'bus-04', 'B12', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B13', 'bus-04', 'B13', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B14', 'bus-04', 'B14', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B15', 'bus-04', 'B15', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B16', 'bus-04', 'B16', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B17', 'bus-04', 'B17', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B18', 'bus-04', 'B18', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B19', 'bus-04', 'B19', 'STANDARD', 'AISLE', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B20', 'bus-04', 'B20', 'STANDARD', 'WINDOW', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B21', 'bus-04', 'B21', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE'),
('seat-bus-04-B22', 'bus-04', 'B22', 'STANDARD', 'BACK', 'DECK_1', 0, 'ACTIVE');

-- 2. Chèn trạng thái ghế cho chuyến xe số 1 mẫu (bảng trip_seats)
INSERT INTO `trip_seats` (`trip_id`, `seat_id`, `seat_number`, `status`, `ticket_id`) VALUES
(1, 'seat-bus-01-A01', 'A01', 'CHECKED_IN', 'tkt-002'),
(1, 'seat-bus-01-A02', 'A02', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A03', 'A03', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A04', 'A04', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A05', 'A05', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A06', 'A06', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A07', 'A07', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A08', 'A08', 'BOOKED', 'tkt-001'),
(1, 'seat-bus-01-A09', 'A09', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A10', 'A10', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A11', 'A11', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A12', 'A12', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A13', 'A13', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A14', 'A14', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A15', 'A15', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A16', 'A16', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A17', 'A17', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A18', 'A18', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A19', 'A19', 'AVAILABLE', NULL),
(1, 'seat-bus-01-A20', 'A20', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B01', 'B01', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B02', 'B02', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B03', 'B03', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B04', 'B04', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B05', 'B05', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B06', 'B06', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B07', 'B07', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B08', 'B08', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B09', 'B09', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B10', 'B10', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B11', 'B11', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B12', 'B12', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B13', 'B13', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B14', 'B14', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B15', 'B15', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B16', 'B16', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B17', 'B17', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B18', 'B18', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B19', 'B19', 'AVAILABLE', NULL),
(1, 'seat-bus-01-B20', 'B20', 'AVAILABLE', NULL);
