-- Idempotently ensure awarded_trip_id and earned_trip_id exist on raffles
-- (in case 0015 was recorded as applied but the rename never executed)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='raffles' AND column_name='trip_id') THEN
    ALTER TABLE raffles RENAME COLUMN trip_id TO awarded_trip_id;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE raffles ADD COLUMN IF NOT EXISTS awarded_trip_id uuid REFERENCES trips(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE raffles ADD COLUMN IF NOT EXISTS earned_trip_id uuid REFERENCES trips(id) ON DELETE SET NULL;
