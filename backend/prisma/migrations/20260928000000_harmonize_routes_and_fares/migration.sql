CREATE TYPE "RouteStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');
CREATE TYPE "FareType" AS ENUM ('FLAT_FARE', 'STAGE_FARE');
CREATE TYPE "TicketType" AS ENUM ('SINGLE', 'MONTHLY_STUDENT', 'MONTHLY_REGULAR', 'PRIORITY');

ALTER TABLE "routes"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "distance_km" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "estimated_duration_min" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "status" "RouteStatus";

UPDATE "routes"
SET "status" = CASE
  WHEN "is_active" THEN 'ACTIVE'::"RouteStatus"
  ELSE 'INACTIVE'::"RouteStatus"
END;

ALTER TABLE "routes"
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'DRAFT',
  DROP COLUMN "is_active",
  ADD COLUMN "deleted_at" TIMESTAMPTZ;

CREATE INDEX "routes_status_idx" ON "routes"("status");
CREATE INDEX "routes_deleted_at_idx" ON "routes"("deleted_at");

ALTER TABLE "bus_stops"
  ADD COLUMN "code" VARCHAR(50),
  ADD COLUMN "address" TEXT,
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deleted_at" TIMESTAMPTZ,
  ALTER COLUMN "latitude" TYPE DOUBLE PRECISION USING "latitude"::DOUBLE PRECISION,
  ALTER COLUMN "longitude" TYPE DOUBLE PRECISION USING "longitude"::DOUBLE PRECISION;

UPDATE "bus_stops"
SET "code" = 'BS-' || replace("id"::TEXT, '-', ''),
    "address" = '';

ALTER TABLE "bus_stops"
  ALTER COLUMN "code" SET NOT NULL,
  ALTER COLUMN "address" SET NOT NULL;

CREATE UNIQUE INDEX "bus_stops_code_key" ON "bus_stops"("code");
CREATE INDEX "bus_stops_latitude_longitude_idx" ON "bus_stops"("latitude", "longitude");
CREATE INDEX "bus_stops_deleted_at_idx" ON "bus_stops"("deleted_at");
CREATE INDEX "bus_stops_is_active_idx" ON "bus_stops"("is_active");

ALTER TABLE "route_stops"
  ADD COLUMN "distance_from_start_km" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "is_terminal" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "trips_status_departure_time_idx" ON "trips"("status", "departure_time");

CREATE TABLE "fares" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "route_id" UUID NOT NULL,
  "fare_type" "FareType" NOT NULL DEFAULT 'FLAT_FARE',
  "ticket_type" "TicketType" NOT NULL DEFAULT 'SINGLE',
  "amount" DOUBLE PRECISION NOT NULL,
  "from_stop_id" UUID,
  "to_stop_id" UUID,
  "effective_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effective_to" TIMESTAMPTZ,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "fares_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fares_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fares_from_stop_id_fkey" FOREIGN KEY ("from_stop_id") REFERENCES "bus_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "fares_to_stop_id_fkey" FOREIGN KEY ("to_stop_id") REFERENCES "bus_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "fares_route_id_idx" ON "fares"("route_id");
CREATE INDEX "fares_fare_type_idx" ON "fares"("fare_type");
CREATE INDEX "fares_deleted_at_idx" ON "fares"("deleted_at");
