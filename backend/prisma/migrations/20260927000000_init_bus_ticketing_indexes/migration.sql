-- CreateTable
CREATE TABLE `routes` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NULL,
    `distance_km` DOUBLE NOT NULL DEFAULT 0.0,
    `estimated_duration_min` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'DRAFT',
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uq_routes_code`(`code`),
    INDEX `routes_status_idx`(`status`),
    INDEX `routes_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bus_stops` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bus_stops_code_key`(`code`),
    INDEX `bus_stops_latitude_longitude_idx`(`latitude`, `longitude`),
    INDEX `bus_stops_deleted_at_idx`(`deleted_at`),
    INDEX `bus_stops_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `route_stops` (
    `id` CHAR(36) NOT NULL,
    `route_id` CHAR(36) NOT NULL,
    `stop_id` CHAR(36) NOT NULL,
    `stop_order` INTEGER NOT NULL,
    `distance_from_start_km` DOUBLE NOT NULL DEFAULT 0.0,
    `estimated_time_minutes` INTEGER NOT NULL DEFAULT 0,
    `is_terminal` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_route_stops_search_covering`(`stop_id`, `route_id`, `stop_order`, `estimated_time_minutes`),
    INDEX `idx_route_stops_route_order`(`route_id`, `stop_order`),
    UNIQUE INDEX `uq_route_stops_route_stop`(`route_id`, `stop_id`),
    UNIQUE INDEX `uq_route_stops_route_order`(`route_id`, `stop_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `buses` (
    `id` CHAR(36) NOT NULL,
    `plate_number` VARCHAR(20) NOT NULL,
    `bus_type` VARCHAR(50) NOT NULL,
    `total_seats` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uq_buses_plate_number`(`plate_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trips` (
    `id` CHAR(36) NOT NULL,
    `route_id` CHAR(36) NOT NULL,
    `bus_id` CHAR(36) NOT NULL,
    `departure_time` DATETIME(3) NOT NULL,
    `arrival_time` DATETIME(3) NOT NULL,
    `status` ENUM('SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `base_price` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_trips_route_status_departure`(`route_id`, `status`, `departure_time`),
    INDEX `trips_status_departure_time_idx`(`status`, `departure_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` CHAR(36) NOT NULL,
    `trip_id` CHAR(36) NOT NULL,
    `booking_code` VARCHAR(50) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uq_bookings_booking_code`(`booking_code`),
    INDEX `idx_bookings_trip_status`(`trip_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `id` CHAR(36) NOT NULL,
    `booking_id` CHAR(36) NOT NULL,
    `trip_id` CHAR(36) NOT NULL,
    `seat_number` VARCHAR(10) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('RESERVED', 'BOOKED', 'CANCELLED') NOT NULL DEFAULT 'RESERVED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_tickets_trip_status`(`trip_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fares` (
    `id` CHAR(36) NOT NULL,
    `route_id` CHAR(36) NOT NULL,
    `fareType` ENUM('FLAT_FARE', 'STAGE_FARE') NOT NULL DEFAULT 'FLAT_FARE',
    `ticket_type` ENUM('SINGLE', 'MONTHLY_STUDENT', 'MONTHLY_REGULAR', 'PRIORITY') NOT NULL DEFAULT 'SINGLE',
    `amount` DOUBLE NOT NULL,
    `from_stop_id` CHAR(36) NULL,
    `to_stop_id` CHAR(36) NULL,
    `effective_from` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effective_to` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `fares_route_id_idx`(`route_id`),
    INDEX `fares_fareType_idx`(`fareType`),
    INDEX `fares_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `route_stops` ADD CONSTRAINT `route_stops_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_stops` ADD CONSTRAINT `route_stops_stop_id_fkey` FOREIGN KEY (`stop_id`) REFERENCES `bus_stops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trips` ADD CONSTRAINT `trips_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trips` ADD CONSTRAINT `trips_bus_id_fkey` FOREIGN KEY (`bus_id`) REFERENCES `buses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_trip_id_fkey` FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_trip_id_fkey` FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fares` ADD CONSTRAINT `fares_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fares` ADD CONSTRAINT `fares_from_stop_id_fkey` FOREIGN KEY (`from_stop_id`) REFERENCES `bus_stops`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fares` ADD CONSTRAINT `fares_to_stop_id_fkey` FOREIGN KEY (`to_stop_id`) REFERENCES `bus_stops`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
