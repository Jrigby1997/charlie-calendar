-- Add RLS policies for event_exceptions table
-- The table was created in supabase_migration_event_exceptions.sql but its policies
-- were explicitly skipped in supabase_migration_add_auth.sql with a TODO comment.
-- This migration also adds the custom_color column used by the event-editing UI.

-- Ensure RLS is enabled (idempotent)
ALTER TABLE event_exceptions ENABLE ROW LEVEL SECURITY;

-- Add custom_color column used by the single-instance edit flow
ALTER TABLE event_exceptions ADD COLUMN IF NOT EXISTS custom_color TEXT;

-- Drop any stale policies before recreating
DROP POLICY IF EXISTS "Users can view exceptions for their events"   ON event_exceptions;
DROP POLICY IF EXISTS "Users can insert exceptions for their events" ON event_exceptions;
DROP POLICY IF EXISTS "Users can update exceptions for their events" ON event_exceptions;
DROP POLICY IF EXISTS "Users can delete exceptions for their events" ON event_exceptions;

-- SELECT: users can read exceptions for events they own
CREATE POLICY "Users can view exceptions for their events"
  ON event_exceptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_exceptions.base_event_id
        AND events.user_id = auth.uid()
    )
  );

-- INSERT
CREATE POLICY "Users can insert exceptions for their events"
  ON event_exceptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_exceptions.base_event_id
        AND events.user_id = auth.uid()
    )
  );

-- UPDATE
CREATE POLICY "Users can update exceptions for their events"
  ON event_exceptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_exceptions.base_event_id
        AND events.user_id = auth.uid()
    )
  );

-- DELETE
CREATE POLICY "Users can delete exceptions for their events"
  ON event_exceptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_exceptions.base_event_id
        AND events.user_id = auth.uid()
    )
  );
