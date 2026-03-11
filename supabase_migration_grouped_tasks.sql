-- =============================================
-- Grouped Tasks Migration
-- =============================================
-- Adds sub-items (inline checklist) to tasks.
-- All sub-items must be checked before the task completion circle activates.
-- Sub-item completions track a period_key so they can reset on schedule.

-- 1. Add group_reset_frequency to tasks table
-- This controls when sub-item completions reset
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS group_reset_frequency TEXT DEFAULT 'daily'
  CHECK (group_reset_frequency IN ('daily', 'weekly', 'monthly', 'never'));

-- 2. Sub-items table: ordered list of checklist items per task
CREATE TABLE IF NOT EXISTS task_sub_items (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- 3. Sub-item completions: tracks which member checked which item in which period
-- period_key examples:
--   daily   → '2025-07-14'
--   weekly  → '2025-07-07' (Monday of that week)
--   monthly → '2025-07-01'
--   never   → 'done'
CREATE TABLE IF NOT EXISTS task_sub_completions (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  family_member_id BIGINT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  sub_item_id BIGINT NOT NULL REFERENCES task_sub_items(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_member_id, sub_item_id, period_key)
);

-- 4. Add period_key to task_completions for grouped task full-completion tracking
-- (also used by rotating tasks to prevent double-completion per rotation period)
ALTER TABLE task_completions
  ADD COLUMN IF NOT EXISTS period_key TEXT;

-- Backfill period_key from completed_date for existing rows
UPDATE task_completions
SET period_key = completed_date::TEXT
WHERE period_key IS NULL;

-- 5. RLS
ALTER TABLE task_sub_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_sub_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their task sub items"
  ON task_sub_items FOR ALL
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their sub completions"
  ON task_sub_completions FOR ALL
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE user_id = auth.uid()
    )
  );
