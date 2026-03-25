-- Migration: Feature Visibility settings
-- Adds show_ingredients and show_rewards columns to app_settings.
-- Both default to true so existing users keep their current experience.

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS show_ingredients BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_rewards     BOOLEAN NOT NULL DEFAULT true;
