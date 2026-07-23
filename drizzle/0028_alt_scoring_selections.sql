-- Migration 0028: alternate scoring game selections
-- Stores which golfers participate in each alternate scoring game (e.g.
-- "7-5-3-1"), keyed by a game identifier, independent of round groups —
-- a JSONB map like { "753": ["golferId1", "golferId2", ...] } so future
-- alternate games can reuse the same column without another migration.

ALTER TABLE golf_rounds ADD COLUMN IF NOT EXISTS alt_scoring_selections jsonb;
