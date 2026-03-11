-- =============================================
-- Rotating Tasks Migration
-- =============================================
-- Allows tasks to rotate between family members, either on
-- completion or on a fixed date interval (e.g., every 7 days).
-- This covers household "family roles" like chore rotation.

-- 1. Add rotation columns to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_rotating BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS rotation_mode TEXT DEFAULT 'completion'
  CHECK (rotation_mode IN ('completion', 'date'));

-- Index for current rotation member (0-based into task_rotation_members order)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS current_rotation_index INTEGER NOT NULL DEFAULT 0;

-- Date when the last rotation happened (used for date-mode rotation)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS last_rotated_date DATE;

-- How many days between rotations (used only when rotation_mode = 'date')
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS rotation_days_interval INTEGER;

-- 2. Ordered rotation roster for each rotating task
-- rotation_order: 0, 1, 2, ... — the order family members rotate in
CREATE TABLE IF NOT EXISTS task_rotation_members (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  family_member_id BIGINT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  rotation_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(task_id, family_member_id),
  UNIQUE(task_id, rotation_order)
);

-- 3. RLS
ALTER TABLE task_rotation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their task rotation members"
  ON task_rotation_members FOR ALL
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE user_id = auth.uid()
    )
  );
