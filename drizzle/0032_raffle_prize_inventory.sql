-- Track whether a won prize has been used or is still available.
-- Only rows where winner_id IS NOT NULL are "inventory" entries.
ALTER TABLE raffle_prizes
  ADD COLUMN prize_status varchar(20) NOT NULL DEFAULT 'available',
  ADD COLUMN used_note text,
  ADD COLUMN updated_at timestamp NOT NULL DEFAULT now();
