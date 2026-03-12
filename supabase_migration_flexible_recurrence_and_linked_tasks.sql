-- =============================================
-- Flexible Recurrence & Calendar-Linked Tasks
-- =============================================
-- Task 8: Flexible Recurrence — tasks repeat every X days/weeks/months
--         (not just daily). Existing daily tasks default to every 1 day.
-- Task 9: Calendar-Linked Tasks — a calendar event can spawn a one-off task
--         that lives in both Calendar view and Tasks view.

-- ── 1. Flexible Recurrence columns ────────────────────────────────────────

-- How many units between recurrences (e.g. 3 → "every 3 days/weeks/months")
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER NOT NULL DEFAULT 1;

-- Unit of recurrence
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS recurrence_unit TEXT NOT NULL DEFAULT 'days'
  CHECK (recurrence_unit IN ('days', 'weeks', 'months'));

-- ── 2. Calendar-Linked Tasks columns ──────────────────────────────────────

-- Specific due date for one-off tasks (nullable; absence = always visible)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS due_date DATE;

-- FK to the source calendar event. ON DELETE CASCADE means deleting the
-- event automatically deletes the linked task.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS linked_event_id BIGINT
  REFERENCES events(id) ON DELETE CASCADE;

-- Index for quickly finding the task that belongs to a given event
CREATE INDEX IF NOT EXISTS idx_tasks_linked_event_id
  ON tasks(linked_event_id);

-- ── 3. Backfill: set due_date for existing one-off tasks where we can ─────
-- (best-effort: use the earliest completion date as a proxy for the due date)
UPDATE tasks t
SET    due_date = (
         SELECT MIN(tc.completed_date)
         FROM   task_completions tc
         WHERE  tc.task_id = t.id
       )
WHERE  t.task_type = 'one_off'
  AND  t.due_date IS NULL;

-- ── Notes ─────────────────────────────────────────────────────────────────
-- • recurrence_interval defaults to 1, recurrence_unit defaults to 'days'
--   so ALL existing daily tasks continue to behave exactly as before.
-- • The front-end filters tasks by isDueOnDate(task, viewDate):
--     one_off  → task.due_date === viewDate  (or null → always visible)
--     daily    → (daysSinceCreated % interval) === 0   (days mode)
--                (weeksSinceCreated % interval) === 0  (weeks mode)
--                (monthsDiff % interval) === 0 AND same day-of-month (months)
-- • linked_event_id CASCADE means no extra cleanup needed on event delete.
-- • RLS is inherited from the existing tasks table policies.
