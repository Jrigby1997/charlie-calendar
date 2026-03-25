-- Add is_special_day flag to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_special_day BOOLEAN NOT NULL DEFAULT FALSE;
