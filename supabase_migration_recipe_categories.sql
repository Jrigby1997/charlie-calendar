-- Create recipe_categories table
CREATE TABLE IF NOT EXISTS recipe_categories (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create recipe_category_junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS recipe_categories_junction (
  id BIGSERIAL PRIMARY KEY,
  recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES recipe_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(recipe_id, category_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_recipe_categories_user_id ON recipe_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_categories_junction_recipe_id ON recipe_categories_junction(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_categories_junction_category_id ON recipe_categories_junction(category_id);

-- Enable Row Level Security
ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_categories_junction ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipe_categories
CREATE POLICY "Users can view their own categories"
  ON recipe_categories FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own categories"
  ON recipe_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own categories"
  ON recipe_categories FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own categories"
  ON recipe_categories FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policies for recipe_categories_junction
CREATE POLICY "Users can view junction entries for their recipes"
  ON recipe_categories_junction FOR SELECT
  USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Users can insert junction entries for their recipes"
  ON recipe_categories_junction FOR INSERT
  WITH CHECK (
    recipe_id IN (
      SELECT id FROM recipes WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Users can delete junction entries for their recipes"
  ON recipe_categories_junction FOR DELETE
  USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

-- Insert default categories
INSERT INTO recipe_categories (user_id, name, color)
VALUES 
  (NULL, 'Breakfast', 'yellow'),
  (NULL, 'Lunch', 'blue'),
  (NULL, 'Dinner', 'purple'),
  (NULL, 'Dessert', 'pink'),
  (NULL, 'Vegetarian', 'green'),
  (NULL, 'Quick', 'orange')
ON CONFLICT DO NOTHING;
