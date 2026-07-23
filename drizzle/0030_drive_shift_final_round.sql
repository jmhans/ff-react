-- Mark a round as a "final round" (n+1 eligible bidders for n driver slots).
-- In final rounds all bids are accepted into the pot, not just the winning bid.
ALTER TABLE drive_shift_rounds ADD COLUMN final_round boolean NOT NULL DEFAULT false;
