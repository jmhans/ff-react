CREATE TABLE IF NOT EXISTS "trips" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "trip_stops" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"trip_id" uuid NOT NULL,
	"stop_order" integer NOT NULL,
	"stop_type" varchar(20) NOT NULL DEFAULT 'other',
	"name" text NOT NULL,
	"location" text,
	"date" date,
	"arrival_time" varchar(10),
	"tee_times" text,
	"notes" text,
	"course_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_trip_id_fkey"
    FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

