-- Migration 0020: Drive Shift Tie-Break System

-- 1. Drop and recreate status check constraint to add 'tiebreak'
ALTER TABLE drive_shift_rounds DROP CONSTRAINT IF EXISTS drive_shift_rounds_status_check;
ALTER TABLE drive_shift_rounds ADD CONSTRAINT drive_shift_rounds_status_check
  CHECK (status IN ('open', 'revealed', 'closed', 'tiebreak'));

-- 2. Tie-break records (one per round that reaches a tie)
CREATE TABLE IF NOT EXISTS drive_shift_tiebreaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES drive_shift_rounds(id) ON DELETE CASCADE,
  status varchar(30) NOT NULL DEFAULT 'number_selection'
    CHECK (status IN ('number_selection', 'rolling', 'awaiting_decision', 'completed')),
  active_golfer_ids jsonb NOT NULL,
  picker_order jsonb NOT NULL,
  die_sides integer NOT NULL,
  rolled_number integer,
  winner_golfer_id uuid REFERENCES golfers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(round_id)
);

-- 3. Golfer number selections per tie-break
CREATE TABLE IF NOT EXISTS drive_shift_tiebreak_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tiebreak_id uuid NOT NULL REFERENCES drive_shift_tiebreaks(id) ON DELETE CASCADE,
  golfer_id uuid NOT NULL REFERENCES golfers(id) ON DELETE CASCADE,
  golfer_name text NOT NULL,
  numbers jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tiebreak_id, golfer_id)
);
