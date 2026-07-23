ALTER TABLE "allocations" DROP CONSTRAINT "golfer_prize";--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "golfer_prize_raffle" UNIQUE("golfer_id","prize_id","raffle_id");