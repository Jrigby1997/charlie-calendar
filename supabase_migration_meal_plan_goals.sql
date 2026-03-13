-- Add meal plan goal settings to app_settings table
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS meal_plan_goals JSONB,
ADD COLUMN IF NOT EXISTS meal_plan_allow_leftovers BOOLEAN NOT NULL DEFAULT FALSE;

-- meal_plan_goals stores JSON like:
-- {
--   "calories": { "enabled": true, "direction": "≤", "value": 2000 },
--   "protein":  { "enabled": true, "direction": "≥", "value": 50 },
--   "fat":      { "enabled": false, "direction": "≤", "value": 65 },
--   "carbs":    { "enabled": true, "direction": "≤", "value": 20 }
-- }
