-- Add aisle column to ingredients table
-- Used by the shopping list view to group items by store section
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS aisle TEXT;

COMMENT ON COLUMN ingredients.aisle IS 'Optional store aisle/section for this ingredient (e.g. "Produce", "Dairy & Eggs"). NULL = uncategorized.';
