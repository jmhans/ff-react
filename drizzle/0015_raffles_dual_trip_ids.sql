DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='raffles' AND column_name='trip_id') THEN
    ALTER TABLE raffles RENAME COLUMN trip_id TO awarded_trip_id;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE raffles ADD COLUMN IF NOT EXISTS awarded_trip_id uuid REFERENCES trips(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE raffles ADD COLUMN IF NOT EXISTS earned_trip_id uuid REFERENCES trips(id) ON DELETE SET NULL;
