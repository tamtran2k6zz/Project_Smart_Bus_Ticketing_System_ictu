-- Keep trip, ticket and crew history while releasing completed trips from operations.
ALTER TABLE trips ADD COLUMN archived_at timestamptz;
ALTER TABLE trips ADD CONSTRAINT archived_trip_completed CHECK(archived_at IS NULL OR status='COMPLETED');
CREATE INDEX trips_operating_departure ON trips(departure_time) WHERE archived_at IS NULL;
