-- Add custom_color column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS custom_color TEXT DEFAULT NULL;

-- Add custom_color column to event_exceptions table
ALTER TABLE event_exceptions ADD COLUMN IF NOT EXISTS custom_color TEXT DEFAULT NULL;

-- Add event_color_mode column to app_settings table
-- 'member' = derive color from assigned family members (default)
-- 'custom' = each event has its own color chosen in the Add Event form
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS event_color_mode TEXT DEFAULT 'member';
