-- Track whether preset ingredients have been seeded for a user
-- When false/null, the app automatically inserts ~170 preset ingredients on first load
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS ingredients_seeded BOOLEAN NOT NULL DEFAULT FALSE;
