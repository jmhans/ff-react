ALTER TABLE "awards" DROP CONSTRAINT "awards_golfer_id_key";--> statement-breakpoint
ALTER TABLE "awards" ADD COLUMN "raffle_id" uuid;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "fk_awards_raffle" FOREIGN KEY ("raffle_id") REFERENCES "public"."raffles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_raffle_golfer" UNIQUE("raffle_id","golfer_id");