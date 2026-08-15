-- Pantry staples: ingredients you always have on hand (salt, oil, etc.).
-- When "Add week's meals to shopping list" runs, staples are skipped so the
-- list only contains things you actually need to buy. Keyed on the ingredient
-- (unit-agnostic), toggled per-ingredient in the Recipes → Ingredients tab.
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS is_pantry_staple BOOLEAN NOT NULL DEFAULT FALSE;
