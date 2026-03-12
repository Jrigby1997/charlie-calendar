-- Fix app_settings so each user has their own isolated row.
-- Previously, queries used .limit(1) with no user_id filter, so all users shared
-- the first row in the table. This migration enforces per-user isolation.

-- 1. Add UNIQUE constraint on user_id (required for upsert onConflict:'user_id')
--    The constraint must be NOT NULL as well -- drop the nullable shared row first.
ALTER TABLE app_settings ADD CONSTRAINT app_settings_user_id_unique UNIQUE (user_id);

-- 2. Delete the old anonymous shared row (user_id IS NULL) that was polluting both accounts.
--    Each signed-in user will get their own row on their next settings save.
DELETE FROM app_settings WHERE user_id IS NULL;

-- 3. Make user_id NOT NULL now that the null row is gone.
ALTER TABLE app_settings ALTER COLUMN user_id SET NOT NULL;

-- 4. Drop the old overly-permissive RLS policies that allowed user_id IS NULL.
DROP POLICY IF EXISTS "Users can view their own settings"   ON app_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON app_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON app_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON app_settings;

-- 5. Create strict per-user RLS policies.
CREATE POLICY "Users can view their own settings"
  ON app_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON app_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON app_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON app_settings FOR DELETE
  USING (auth.uid() = user_id);
