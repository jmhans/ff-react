ALTER TABLE "raffles" ADD COLUMN IF NOT EXISTS "trip_id" uuid;
DO $$ BEGIN
  ALTER TABLE "raffles" ADD CONSTRAINT "fk_raffles_trip"
    FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
