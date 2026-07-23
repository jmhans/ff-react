CREATE TABLE IF NOT EXISTS "bed_bet_rounds" (
"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
"trip_id" uuid NOT NULL,
"date" date NOT NULL,
"course" text,
"notes" text,
"created_at" timestamp DEFAULT now() NOT NULL,
"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bed_bet_results" (
"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
"round_id" uuid NOT NULL,
"golfer_id" uuid NOT NULL,
"rank" integer NOT NULL,
"points" numeric(8, 2) NOT NULL,
CONSTRAINT "bed_bet_results_round_golfer_unique" UNIQUE("round_id","golfer_id")
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bed_bet_rounds_trip_id_fkey'
  ) THEN
    ALTER TABLE "bed_bet_rounds" ADD CONSTRAINT "bed_bet_rounds_trip_id_fkey"
      FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE cascade ON UPDATE cascade;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bed_bet_results_round_id_fkey'
  ) THEN
    ALTER TABLE "bed_bet_results" ADD CONSTRAINT "bed_bet_results_round_id_fkey"
      FOREIGN KEY ("round_id") REFERENCES "bed_bet_rounds"("id") ON DELETE cascade ON UPDATE cascade;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bed_bet_results_golfer_id_fkey'
  ) THEN
    ALTER TABLE "bed_bet_results" ADD CONSTRAINT "bed_bet_results_golfer_id_fkey"
      FOREIGN KEY ("golfer_id") REFERENCES "golfers"("id") ON DELETE cascade ON UPDATE cascade;
  END IF;
END $$;
