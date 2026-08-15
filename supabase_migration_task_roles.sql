-- Family roles: a "role" is a rotating task that isn't completed (Movie Picker,
-- Treat Maker, Prayer Master…). It reuses the existing rotation engine
-- (task_rotation_members roster + rotation_days_interval + last_rotated_date)
-- with rotation_mode='date', and just carries this flag so the UI shows the
-- current holder instead of a completion checkbox.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_role BOOLEAN NOT NULL DEFAULT FALSE;
