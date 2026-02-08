-- Add recipe_counts to track sources
ALTER TABLE shopping_list
  ADD COLUMN IF NOT EXISTS recipe_counts JSONB NOT NULL DEFAULT '{}'::jsonb;
