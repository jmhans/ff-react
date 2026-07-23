-- Mark one shift per trip as "live" so the UI can feature it prominently
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false;
