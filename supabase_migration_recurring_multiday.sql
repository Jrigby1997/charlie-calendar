-- Add columns for recurring events and multi-day events

-- Add end_date for multi-day events
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date TEXT;

-- Add recurring event columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT; -- 'daily', 'weekly', 'monthly', 'yearly'
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1; -- repeat every X days/weeks/months
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_end_date TEXT; -- when to stop recurring
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_days TEXT; -- JSON array for weekly recurrence (e.g., ["monday", "wednesday", "friday"])

-- Add comment for clarity
COMMENT ON COLUMN events.end_date IS 'End date for multi-day events (format: YYYY-MM-DD)';
COMMENT ON COLUMN events.is_recurring IS 'Whether this is a recurring event';
COMMENT ON COLUMN events.recurrence_pattern IS 'Pattern: daily, weekly, monthly, or yearly';
COMMENT ON COLUMN events.recurrence_interval IS 'Repeat every X days/weeks/months (default 1)';
COMMENT ON COLUMN events.recurrence_end_date IS 'Date when recurrence stops (format: YYYY-MM-DD)';
COMMENT ON COLUMN events.recurrence_days IS 'Days of week for weekly recurrence (JSON array)';
