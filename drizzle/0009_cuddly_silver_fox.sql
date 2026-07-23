CREATE TABLE IF NOT EXISTS "courses" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	"location" text,
	"pars" jsonb NOT NULL,
	"hole_details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "golf_rounds" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"course_id" uuid NOT NULL,
	"date" date NOT NULL,
	"season" integer NOT NULL,
	"round_type" varchar(50),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"jim_game_count" integer DEFAULT 4,
	"round_name" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "round_groups" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"round_id" uuid NOT NULL,
	"group_number" integer NOT NULL,
	"group_type" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"jim_game_counts" jsonb DEFAULT '[]'::jsonb,
	"pairs" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "round_scores" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"round_id" uuid NOT NULL,
	"golfer_id" uuid NOT NULL,
	"group_id" uuid,
	"scores" jsonb NOT NULL,
	"total_gross" integer NOT NULL,
	"total_net" integer NOT NULL,
	"total_par" integer NOT NULL,
	"score_to_par" integer NOT NULL,
	"front_nine_gross" integer,
	"front_nine_net" integer,
	"back_nine_gross" integer,
	"back_nine_net" integer,
	"current_streak" integer DEFAULT 0,
	"current_streak_type" varchar(20),
	"longest_streak" integer DEFAULT 0,
	"longest_streak_type" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"streak_points" integer DEFAULT 0,
	"course_handicap" integer DEFAULT 0,
	"tickets" integer DEFAULT 0,
	"group_tickets" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "awards" DROP CONSTRAINT IF EXISTS "awards_raffle_golfer";--> statement-breakpoint
ALTER TABLE "raffles" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "golf_rounds" ADD CONSTRAINT "golf_rounds_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE cascade; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "round_groups" ADD CONSTRAINT "round_groups_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."golf_rounds"("id") ON DELETE cascade ON UPDATE cascade; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "round_scores" ADD CONSTRAINT "round_scores_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."golf_rounds"("id") ON DELETE cascade ON UPDATE cascade; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "round_scores" ADD CONSTRAINT "round_scores_golfer_id_fkey" FOREIGN KEY ("golfer_id") REFERENCES "public"."golfers"("id") ON DELETE cascade ON UPDATE cascade; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "round_scores" ADD CONSTRAINT "round_scores_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."round_groups"("id") ON DELETE set null ON UPDATE cascade; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_golf_rounds_date" ON "golf_rounds" USING btree ("date" date_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_golf_rounds_season" ON "golf_rounds" USING btree ("season" int4_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_round_groups_round" ON "round_groups" USING btree ("round_id" uuid_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_round_scores_golfer" ON "round_scores" USING btree ("golfer_id" uuid_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_round_scores_round" ON "round_scores" USING btree ("round_id" uuid_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_round_scores_round_golfer" ON "round_scores" USING btree ("round_id" uuid_ops,"golfer_id" uuid_ops);--> statement-breakpoint
ALTER TABLE "raffles" DROP COLUMN IF EXISTS "decription";