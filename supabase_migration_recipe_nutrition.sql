-- Add nutrition and description columns to recipes table
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS protein DECIMAL(10,2);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS fat DECIMAL(10,2);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS carbs DECIMAL(10,2);

-- Insert dietary tag categories
INSERT INTO recipe_categories (user_id, name, color)
VALUES
  (NULL, 'Vegan', 'green'),
  (NULL, 'Gluten-Free', 'yellow'),
  (NULL, 'Dairy-Free', 'blue'),
  (NULL, 'Keto', 'purple'),
  (NULL, 'Low-Carb', 'orange'),
  (NULL, 'Paleo', 'pink')
ON CONFLICT DO NOTHING;
