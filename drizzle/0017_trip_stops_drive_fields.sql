ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS shift_label text;
--> statement-breakpoint
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer;
