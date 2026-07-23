ALTER TABLE "golf_rounds" ADD COLUMN IF NOT EXISTS "trip_id" uuid;
DO $$ BEGIN
  ALTER TABLE "golf_rounds" ADD CONSTRAINT "fk_golf_rounds_trip"
    FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "idx_golf_rounds_trip_id" ON "golf_rounds" ("trip_id");
