-- Create meal_types table for customizable meal categories
CREATE TABLE IF NOT EXISTS meal_types (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_meal_type UNIQUE (user_id, name)
);

-- Create meal_plans table to assign recipes to specific dates and meal types
CREATE TABLE IF NOT EXISTS meal_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_date_meal_type UNIQUE (user_id, date, meal_type)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_meal_types_user_id ON meal_types(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id_date ON meal_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe_id ON meal_plans(recipe_id);

-- Enable Row Level Security
ALTER TABLE meal_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meal_types
CREATE POLICY "Users can view their own meal types"
  ON meal_types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal types"
  ON meal_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal types"
  ON meal_types FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal types"
  ON meal_types FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for meal_plans
CREATE POLICY "Users can view their own meal plans"
  ON meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal plans"
  ON meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plans"
  ON meal_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal plans"
  ON meal_plans FOR DELETE
  USING (auth.uid() = user_id);
