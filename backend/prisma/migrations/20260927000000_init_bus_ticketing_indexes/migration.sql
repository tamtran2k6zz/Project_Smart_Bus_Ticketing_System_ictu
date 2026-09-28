CREATE TABLE `routes` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `routes_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `bus_stops` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `route_stops` (
    `id` CHAR(36) NOT NULL,
    `route_id` CHAR(36) NOT NULL,
    `stop_id` CHAR(36) NOT NULL,
    `stop_order` INTEGER NOT NULL,
    `estimated_time_minutes` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `route_stops_route_id_stop_id_key`(`route_id`, `stop_id`),
    UNIQUE INDEX `route_stops_route_id_stop_order_key`(`route_id`, `stop_order`),
    INDEX `route_stops_stop_id_route_id_stop_order_idx`(`stop_id`, `route_id`, `stop_order`),
    INDEX `route_stops_route_id_stop_order_idx`(`route_id`, `stop_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `buses` (
    `id` CHAR(36) NOT NULL,
    `plate_number` VARCHAR(20) NOT NULL,
    `bus_type` VARCHAR(50) NOT NULL,
    `total_seats` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `buses_plate_number_key`(`plate_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

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

    INDEX `trips_route_id_departure_time_status_idx`(`route_id`, `departure_time`, `status`),
    INDEX `trips_status_departure_time_idx`(`status`, `departure_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `bookings` (
    `id` CHAR(36) NOT NULL,
    `trip_id` CHAR(36) NOT NULL,
    `booking_code` VARCHAR(50) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bookings_booking_code_key`(`booking_code`),
    INDEX `bookings_trip_id_status_idx`(`trip_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `tickets` (
    `id` CHAR(36) NOT NULL,
    `booking_id` CHAR(36) NOT NULL,
    `trip_id` CHAR(36) NOT NULL,
    `seat_number` VARCHAR(10) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('RESERVED', 'BOOKED', 'CANCELLED') NOT NULL DEFAULT 'RESERVED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tickets_trip_id_status_idx`(`trip_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

ALTER TABLE `route_stops`
    ADD CONSTRAINT `route_stops_route_id_fkey`
    FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `route_stops`
    ADD CONSTRAINT `route_stops_stop_id_fkey`
    FOREIGN KEY (`stop_id`) REFERENCES `bus_stops`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `trips`
    ADD CONSTRAINT `trips_route_id_fkey`
    FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `trips`
    ADD CONSTRAINT `trips_bus_id_fkey`
    FOREIGN KEY (`bus_id`) REFERENCES `buses`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `bookings`
    ADD CONSTRAINT `bookings_trip_id_fkey`
    FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tickets`
    ADD CONSTRAINT `tickets_booking_id_fkey`
    FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tickets`
    ADD CONSTRAINT `tickets_trip_id_fkey`
    FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
