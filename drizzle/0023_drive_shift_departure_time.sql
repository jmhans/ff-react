-- Migration 0023: Departure time for drive shifts

ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS departure_time varchar(10);
