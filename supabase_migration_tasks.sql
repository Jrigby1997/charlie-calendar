-- ============================================
-- Task List & Rewards System Migration
-- ============================================

-- 1. Tasks table - task definitions (daily or one-off)
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'daily' CHECK (task_type IN ('daily', 'one_off')),
  points INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(is_active);

-- 2. Task assignments - which family members are assigned to which tasks
CREATE TABLE IF NOT EXISTS task_assignments (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  family_member_id BIGINT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  UNIQUE(task_id, family_member_id)
);

ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own task assignments" ON task_assignments;
DROP POLICY IF EXISTS "Users can insert their own task assignments" ON task_assignments;
DROP POLICY IF EXISTS "Users can update their own task assignments" ON task_assignments;
DROP POLICY IF EXISTS "Users can delete their own task assignments" ON task_assignments;

CREATE POLICY "Users can view their own task assignments"
  ON task_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks WHERE tasks.id = task_assignments.task_id AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own task assignments"
  ON task_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks WHERE tasks.id = task_assignments.task_id AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own task assignments"
  ON task_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks WHERE tasks.id = task_assignments.task_id AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own task assignments"
  ON task_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks WHERE tasks.id = task_assignments.task_id AND tasks.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_member_id ON task_assignments(family_member_id);

-- 3. Task completions - tracks when a task was completed by whom on what date
CREATE TABLE IF NOT EXISTS task_completions (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  family_member_id BIGINT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, family_member_id, completed_date)
);

ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can insert their own task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can update their own task completions" ON task_completions;
DROP POLICY IF EXISTS "Users can delete their own task completions" ON task_completions;

CREATE POLICY "Users can view their own task completions"
  ON task_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks WHERE tasks.id = task_completions.task_id AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own task completions"
  ON task_completions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks WHERE tasks.id = task_completions.task_id AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own task completions"
  ON task_completions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks WHERE tasks.id = task_completions.task_id AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own task completions"
  ON task_completions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks WHERE tasks.id = task_completions.task_id AND tasks.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_member_id ON task_completions(family_member_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_date ON task_completions(completed_date);

-- 4. Member points - running point totals per family member
CREATE TABLE IF NOT EXISTS member_points (
  id BIGSERIAL PRIMARY KEY,
  family_member_id BIGINT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  redeemed_points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE member_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own member points" ON member_points;
DROP POLICY IF EXISTS "Users can insert their own member points" ON member_points;
DROP POLICY IF EXISTS "Users can update their own member points" ON member_points;
DROP POLICY IF EXISTS "Users can delete their own member points" ON member_points;

CREATE POLICY "Users can view their own member points"
  ON member_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members WHERE family_members.id = member_points.family_member_id AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own member points"
  ON member_points FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members WHERE family_members.id = member_points.family_member_id AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own member points"
  ON member_points FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_members WHERE family_members.id = member_points.family_member_id AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own member points"
  ON member_points FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM family_members WHERE family_members.id = member_points.family_member_id AND family_members.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_member_points_member_id ON member_points(family_member_id);

-- 5. Enable Supabase Realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE task_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE member_points;
