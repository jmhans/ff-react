-- Migration 0029: no-op
-- The allocations table already has golfer_prize_raffle UNIQUE(golfer_id, prize_id, raffle_id).
-- ON CONFLICT clauses in actions.ts have been updated to match this 3-column constraint.
SELECT 1;
