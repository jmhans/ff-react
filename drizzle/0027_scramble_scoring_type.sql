-- Migration 0027: explicit scoring_type + Scramble variant
-- scoring_type: 'jim_game' (default), 'count_n', or 'scramble'.
-- Scramble records one score per TEAM (group), not per golfer — separate table.

ALTER TABLE golf_rounds ADD COLUMN IF NOT EXISTS scoring_type varchar(20) NOT NULL DEFAULT 'jim_game';
UPDATE golf_rounds SET scoring_type = 'count_n' WHERE count_n IS NOT NULL AND scoring_type = 'jim_game';

CREATE TABLE IF NOT EXISTS round_team_scores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id uuid NOT NULL REFERENCES golf_rounds(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES round_groups(id) ON DELETE CASCADE,
  team_handicap integer DEFAULT 0,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_gross integer NOT NULL DEFAULT 0,
  total_net integer NOT NULL DEFAULT 0,
  total_par integer NOT NULL DEFAULT 0,
  score_to_par integer NOT NULL DEFAULT 0,
  front_nine_gross integer,
  front_nine_net integer,
  back_nine_gross integer,
  back_nine_net integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(round_id, group_id)
);
