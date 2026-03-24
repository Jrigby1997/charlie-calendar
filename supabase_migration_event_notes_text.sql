-- Add free-text notes field to events (separate from the short description shown on tiles)
ALTER TABLE events ADD COLUMN IF NOT EXISTS notes TEXT;
