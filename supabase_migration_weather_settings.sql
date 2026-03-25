-- Add weather settings columns to app_settings
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS weather_location TEXT,
  ADD COLUMN IF NOT EXISTS weather_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS weather_lon DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS weather_units TEXT NOT NULL DEFAULT 'fahrenheit';
