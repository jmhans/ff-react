-- Track when a golfer plays a raffle prize card in a drive shift bid
ALTER TABLE drive_shift_bids
  ADD COLUMN played_raffle_prize_id uuid REFERENCES raffle_prizes(id) ON DELETE SET NULL;

-- Mechanical prize type identifier so we can match by type rather than name
ALTER TABLE prizes ADD COLUMN prize_type varchar(50);

-- Tag the existing drive bid bonus prize
UPDATE prizes SET prize_type = 'drive_bid_bonus'
WHERE summary ILIKE '%drive%bid%' OR summary ILIKE '%drive%shift%bid%';
