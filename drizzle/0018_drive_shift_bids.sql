CREATE TABLE IF NOT EXISTS drive_shift_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_stop_id uuid NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
  golfer_id uuid NOT NULL REFERENCES golfers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(trip_stop_id, golfer_id)
);
