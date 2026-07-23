CREATE TABLE "golf_pool_players" (
	"player_id" uuid NOT NULL,
	"golf_pool" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "golf_pools" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"description" text,
	"summary" text
);
--> statement-breakpoint
ALTER TABLE "prizes" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "golf_pool_players" ADD CONSTRAINT "fk_golf_pool_player_golfer" FOREIGN KEY ("player_id") REFERENCES "public"."golfers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "golf_pool_players" ADD CONSTRAINT "fk_golf_pool_player_pool" FOREIGN KEY ("golf_pool") REFERENCES "public"."golf_pools"("id") ON DELETE cascade ON UPDATE cascade;