-- Create app_settings table for user customizations
CREATE TABLE IF NOT EXISTS app_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_title TEXT NOT NULL DEFAULT 'Charlie Calendar',
  family_section_title TEXT NOT NULL DEFAULT 'Family Members',
  color_theme TEXT NOT NULL DEFAULT 'default',
  date_format TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
  week_start_day TEXT NOT NULL DEFAULT 'Sunday',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_app_settings_user_id ON app_settings(user_id);

-- Enable Row Level Security
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_settings
CREATE POLICY "Users can view their own settings"
  ON app_settings FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own settings"
  ON app_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own settings"
  ON app_settings FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own settings"
  ON app_settings FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Insert default settings row (for use before auth is implemented)
INSERT INTO app_settings (user_id, calendar_title, family_section_title, color_theme, date_format, week_start_day)
VALUES (NULL, 'Charlie Calendar', 'Family Members', 'default', 'MM/DD/YYYY', 'Sunday')
ON CONFLICT DO NOTHING;
