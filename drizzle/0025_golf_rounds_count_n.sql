-- Migration 0025: CountN variant for golf rounds
-- When set, every hole counts exactly N best net scores for both groups,
-- instead of the Jim Game's flexible per-hole manual allocation.

ALTER TABLE golf_rounds ADD COLUMN IF NOT EXISTS count_n integer;
