-- Migration 0024: round_scores needs a real unique constraint on (round_id, golfer_id)
-- so that ON CONFLICT (round_id, golfer_id) in createRoundGroup works. It previously
-- only had a plain (non-unique) index, which Postgres can't match against ON CONFLICT.

DROP INDEX IF EXISTS idx_round_scores_round_golfer;
ALTER TABLE round_scores DROP CONSTRAINT IF EXISTS round_scores_round_golfer_unique;
ALTER TABLE round_scores ADD CONSTRAINT round_scores_round_golfer_unique UNIQUE (round_id, golfer_id);
