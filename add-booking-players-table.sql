-- Migration: Add booking_players table to store all players in each booking
-- This allows us to track which specific members are in each booking,
-- not just the main member and total count.

-- Create booking_players table
CREATE TABLE IF NOT EXISTS booking_players (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  is_main_player BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id, member_id) -- Prevent duplicate members in same booking
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_players_booking_id ON booking_players(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_players_member_id ON booking_players(member_id);
CREATE INDEX IF NOT EXISTS idx_booking_players_is_main ON booking_players(is_main_player);

-- Enable RLS
ALTER TABLE booking_players ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to allow re-running this script)
DROP POLICY IF EXISTS "Authenticated users have full access to booking_players" ON booking_players;

-- RLS Policy: Allow authenticated users full access
CREATE POLICY "Authenticated users have full access to booking_players"
  ON booking_players FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Migrate existing bookings: Create booking_players records for existing bookings
-- This assumes all existing bookings only have the main member
-- Only migrate bookings that have a valid member_id
INSERT INTO booking_players (booking_id, member_id, is_main_player)
SELECT id, member_id, TRUE
FROM bookings
WHERE member_id IS NOT NULL
  AND id NOT IN (SELECT DISTINCT booking_id FROM booking_players WHERE booking_id IS NOT NULL)
ON CONFLICT (booking_id, member_id) DO NOTHING;

