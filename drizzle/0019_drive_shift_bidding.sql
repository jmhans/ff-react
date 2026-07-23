-- Migration 0019: Drive Shift Bidding System
-- Replaces the old drive_shift_bids (no amounts) with a full round-based blind auction system

-- 1. Add required_drivers to trip_stops
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS required_drivers integer NOT NULL DEFAULT 1;

-- 2. Trip attendees — who is eligible to bid on shifts for a given trip
CREATE TABLE IF NOT EXISTS trip_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  golfer_id uuid NOT NULL REFERENCES golfers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_id, golfer_id)
);

-- 3. Bidding rounds — one per round per shift
CREATE TABLE IF NOT EXISTS drive_shift_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_stop_id uuid NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'revealed', 'closed')),
  accepted_golfer_id uuid REFERENCES golfers(id) ON DELETE SET NULL,
  accepted_amount numeric(10, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_stop_id, round_number)
);

-- 4. Drop old drive_shift_bids and recreate with amount + round FK
DROP TABLE IF EXISTS drive_shift_bids;

CREATE TABLE drive_shift_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES drive_shift_rounds(id) ON DELETE CASCADE,
  golfer_id uuid NOT NULL REFERENCES golfers(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(round_id, golfer_id)
);

-- 5. Admin-granted exemptions (normal round buyouts + raffle prizes + manual overrides)
CREATE TABLE IF NOT EXISTS drive_shift_exemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_stop_id uuid NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
  golfer_id uuid NOT NULL REFERENCES golfers(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_stop_id, golfer_id)
);

-- 6. Confirmed drivers for a shift
CREATE TABLE IF NOT EXISTS drive_shift_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_stop_id uuid NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
  golfer_id uuid NOT NULL REFERENCES golfers(id) ON DELETE CASCADE,
  earnings numeric(10, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_stop_id, golfer_id)
);
