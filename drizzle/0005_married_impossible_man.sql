CREATE TABLE "raffle_prizes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"raffle_id" uuid NOT NULL,
	"prize_id" uuid NOT NULL,
	CONSTRAINT "raffle_prize_unique" UNIQUE("raffle_id","prize_id")
);
--> statement-breakpoint
ALTER TABLE "raffle_prizes" ADD CONSTRAINT "fk_raffle_prizes_raffle" FOREIGN KEY ("raffle_id") REFERENCES "public"."raffles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "raffle_prizes" ADD CONSTRAINT "fk_raffle_prizes_prize" FOREIGN KEY ("prize_id") REFERENCES "public"."prizes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "prizes" DROP COLUMN "raffle_id";