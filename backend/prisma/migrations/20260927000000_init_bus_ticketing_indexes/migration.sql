-- Smart Bus Ticketing System - PostgreSQL DDL Migration
-- Author: N5 Innovators - Senior Backend Engineer
-- Feature: Trip Search Optimization with Advanced Indexing

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TicketStatus" AS ENUM ('RESERVED', 'BOOKED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Table: routes
CREATE TABLE IF NOT EXISTS "routes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_routes_code" UNIQUE ("code")
);

-- 3. Create Table: bus_stops
CREATE TABLE IF NOT EXISTS "bus_stops" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "latitude" DECIMAL(10, 7) NOT NULL,
    "longitude" DECIMAL(10, 7) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Table: route_stops
CREATE TABLE IF NOT EXISTS "route_stops" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "route_id" UUID NOT NULL REFERENCES "routes"("id") ON DELETE CASCADE,
    "stop_id" UUID NOT NULL REFERENCES "bus_stops"("id") ON DELETE CASCADE,
    "stop_order" INT NOT NULL CHECK ("stop_order" > 0),
    "estimated_time_minutes" INT NOT NULL DEFAULT 0 CHECK ("estimated_time_minutes" >= 0),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_route_stops_route_stop" UNIQUE ("route_id", "stop_id"),
    CONSTRAINT "uq_route_stops_route_order" UNIQUE ("route_id", "stop_order")
);

-- 5. Create Table: buses
CREATE TABLE IF NOT EXISTS "buses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "plate_number" VARCHAR(20) NOT NULL,
    "bus_type" VARCHAR(50) NOT NULL,
    "total_seats" INT NOT NULL CHECK ("total_seats" > 0),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_buses_plate_number" UNIQUE ("plate_number")
);

-- 6. Create Table: trips
CREATE TABLE IF NOT EXISTS "trips" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "route_id" UUID NOT NULL REFERENCES "routes"("id") ON DELETE RESTRICT,
    "bus_id" UUID NOT NULL REFERENCES "buses"("id") ON DELETE RESTRICT,
    "departure_time" TIMESTAMPTZ NOT NULL,
    "arrival_time" TIMESTAMPTZ NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "base_price" DECIMAL(12, 2) NOT NULL CHECK ("base_price" >= 0),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chk_trips_arrival_after_departure" CHECK ("arrival_time" > "departure_time")
);

-- 7. Create Table: bookings
CREATE TABLE IF NOT EXISTS "bookings" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "trip_id" UUID NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
    "booking_code" VARCHAR(50) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "total_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK ("total_amount" >= 0),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_bookings_booking_code" UNIQUE ("booking_code")
);

-- 8. Create Table: tickets
CREATE TABLE IF NOT EXISTS "tickets" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
    "trip_id" UUID NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
    "seat_number" VARCHAR(10) NOT NULL,
    "price" DECIMAL(12, 2) NOT NULL CHECK ("price" >= 0),
    "status" "TicketStatus" NOT NULL DEFAULT 'RESERVED',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEX OPTIMIZATION SECTION (TARGET: Query execution time < 100ms at scale)
-- ============================================================================

-- A. route_stops:
-- Composite Index covering stop_id, route_id, stop_order, estimated_time_minutes.
-- Enables Index-Only Scan when finding routes connecting origin_stop and destination_stop.
CREATE INDEX IF NOT EXISTS "idx_route_stops_search_covering"
ON "route_stops" ("stop_id", "route_id", "stop_order", "estimated_time_minutes");

-- B-tree index on (route_id, stop_order) for quick route trajectory resolution.
CREATE INDEX IF NOT EXISTS "idx_route_stops_route_order"
ON "route_stops" ("route_id", "stop_order");

-- B. trips:
-- Composite B-Tree index for route search with date range and status.
CREATE INDEX IF NOT EXISTS "idx_trips_route_status_departure"
ON "trips" ("route_id", "status", "departure_time");

-- High-performance Partial Index: In real production, >90% of trips are COMPLETED or CANCELLED.
-- Indexing ONLY 'SCHEDULED' trips keeps index compact in RAM buffer cache for < 10ms lookup!
CREATE INDEX IF NOT EXISTS "idx_trips_scheduled_active"
ON "trips" ("route_id", "departure_time")
WHERE "status" = 'SCHEDULED';

-- C. tickets:
-- Partial index on (trip_id) for ACTIVE tickets ('BOOKED' or 'RESERVED').
-- Dramatically speeds up available seat calculation: Total Seats - COUNT(active tickets).
CREATE INDEX IF NOT EXISTS "idx_tickets_trip_active_seats"
ON "tickets" ("trip_id")
WHERE "status" IN ('BOOKED', 'RESERVED');

-- Unique constraint ensuring no double-booking for the same active seat on a trip
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tickets_trip_active_seat"
ON "tickets" ("trip_id", "seat_number")
WHERE "status" IN ('BOOKED', 'RESERVED');

-- D. bookings:
CREATE INDEX IF NOT EXISTS "idx_bookings_trip_status"
ON "bookings" ("trip_id", "status");
