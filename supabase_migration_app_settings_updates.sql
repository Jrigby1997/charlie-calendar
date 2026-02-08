-- Add new columns to app_settings table (run this if you already ran the initial migration)
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS color_theme TEXT NOT NULL DEFAULT 'default',
ADD COLUMN IF NOT EXISTS date_format TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
ADD COLUMN IF NOT EXISTS week_start_day TEXT NOT NULL DEFAULT 'Sunday';

-- Update existing row with new defaults if it exists
UPDATE app_settings
SET
  color_theme = COALESCE(color_theme, 'default'),
  date_format = COALESCE(date_format, 'MM/DD/YYYY'),
  week_start_day = COALESCE(week_start_day, 'Sunday')
WHERE user_id IS NULL;
