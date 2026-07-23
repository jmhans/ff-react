-- Trip-level vehicle fleet (defaults for all shifts on a trip)
CREATE TABLE trip_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  passenger_capacity integer NOT NULL DEFAULT 3,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- Per-shift vehicle assignments (seeded from fleet, editable per shift)
CREATE TABLE trip_stop_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_stop_id uuid NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
  trip_vehicle_id uuid REFERENCES trip_vehicles(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  passenger_capacity integer NOT NULL DEFAULT 3,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
