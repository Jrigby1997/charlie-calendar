-- Add aliases array to ingredients table
-- This allows ingredient variants (e.g. "large eggs", "Egg", "eggs") to all point to
-- the same master ingredient for proper shopping list aggregation and autocomplete matching.

ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}';

-- GIN index for fast array containment queries (e.g. 'large eggs' = ANY(aliases))
CREATE INDEX IF NOT EXISTS idx_ingredients_aliases
  ON ingredients USING GIN (aliases);
