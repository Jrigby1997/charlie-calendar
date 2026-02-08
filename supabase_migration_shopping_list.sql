-- Create shopping_list table
CREATE TABLE IF NOT EXISTS shopping_list (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  measurement TEXT NOT NULL,
  recipe_id BIGINT REFERENCES recipes(id) ON DELETE SET NULL, -- Optional: track where it came from
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ingredient_id, measurement) -- Same ingredient + measurement = combine amounts
);

-- Enable Row Level Security
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own shopping list" ON shopping_list;
DROP POLICY IF EXISTS "Users can insert their own shopping list items" ON shopping_list;
DROP POLICY IF EXISTS "Users can update their own shopping list items" ON shopping_list;
DROP POLICY IF EXISTS "Users can delete their own shopping list items" ON shopping_list;

-- RLS Policies
CREATE POLICY "Users can view their own shopping list"
  ON shopping_list FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopping list items"
  ON shopping_list FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping list items"
  ON shopping_list FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping list items"
  ON shopping_list FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shopping_list_user_id ON shopping_list(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_ingredient_id ON shopping_list(ingredient_id);
