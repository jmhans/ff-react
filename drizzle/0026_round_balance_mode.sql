-- Migration 0026: Round balancing for uneven groups
-- balance_mode: null (off), 'rando' (add a fake golfer to the smaller group),
-- or 'ignore' (randomly ignore N real scores per hole from the bigger group,
-- N = the group-size difference). Mutually exclusive, set per round.

ALTER TABLE golf_rounds ADD COLUMN IF NOT EXISTS balance_mode varchar(10);
ALTER TABLE round_groups ADD COLUMN IF NOT EXISTS ignore_golfer_ids jsonb;
