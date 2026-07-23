CREATE TABLE IF NOT EXISTS "buddy_bets" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
        "description" text NOT NULL,
        "bettor1_id" uuid NOT NULL,
        "bettor2_id" uuid NOT NULL,
        "winner_id" uuid,
        "status" varchar(20) DEFAULT 'in_progress' NOT NULL,
        "stakes_type" varchar(10) DEFAULT 'drinks' NOT NULL,
        "stakes_value" numeric(10, 2) NOT NULL,
        "comment" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "golf_rounds" ALTER COLUMN "jim_game_count" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "round_groups" ALTER COLUMN "jim_game_counts" DROP DEFAULT;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "buddy_bets" ADD CONSTRAINT "buddy_bets_bettor1_fkey" FOREIGN KEY ("bettor1_id") REFERENCES "public"."golfers"("id") ON DELETE cascade ON UPDATE cascade; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "buddy_bets" ADD CONSTRAINT "buddy_bets_bettor2_fkey" FOREIGN KEY ("bettor2_id") REFERENCES "public"."golfers"("id") ON DELETE cascade ON UPDATE cascade; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "buddy_bets" ADD CONSTRAINT "buddy_bets_winner_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."golfers"("id") ON DELETE set null ON UPDATE cascade; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
