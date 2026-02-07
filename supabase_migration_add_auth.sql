-- First, check and fix the user_id column type if needed
DO $$
BEGIN
  -- Check if user_id exists and is not UUID type in family_members
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members'
    AND column_name = 'user_id'
    AND data_type != 'uuid'
  ) THEN
    -- Drop the incorrectly typed column
    ALTER TABLE family_members DROP COLUMN user_id;
  END IF;

  -- Now add it with correct type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE family_members ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Same for events table
DO $$
BEGIN
  -- Check if user_id exists and is not UUID type in events
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events'
    AND column_name = 'user_id'
    AND data_type != 'uuid'
  ) THEN
    -- Drop the incorrectly typed column
    ALTER TABLE events DROP COLUMN user_id;
  END IF;

  -- Now add it with correct type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE events ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better query performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);

-- Enable Row Level Security on family_members
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on event_family_members
ALTER TABLE event_family_members ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on event_exceptions (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_exceptions') THEN
    ALTER TABLE event_exceptions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Enable Row Level Security on exception_family_members (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exception_family_members') THEN
    ALTER TABLE exception_family_members ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can view their own family members" ON family_members;
CREATE POLICY "Users can view their own family members" ON family_members
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own family members" ON family_members;
CREATE POLICY "Users can insert their own family members" ON family_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own family members" ON family_members;
CREATE POLICY "Users can update their own family members" ON family_members
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own family members" ON family_members;
CREATE POLICY "Users can delete their own family members" ON family_members
  FOR DELETE USING (auth.uid() = user_id);

-- Create policy for events (users can only see their own events)
DROP POLICY IF EXISTS "Users can view their own events" ON events;
CREATE POLICY "Users can view their own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own events" ON events;
CREATE POLICY "Users can insert their own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own events" ON events;
CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own events" ON events;
CREATE POLICY "Users can delete their own events" ON events
  FOR DELETE USING (auth.uid() = user_id);

-- Create policy for event_family_members (based on event ownership)
DROP POLICY IF EXISTS "Users can view their own event family members" ON event_family_members;
CREATE POLICY "Users can view their own event family members" ON event_family_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_family_members.event_id
      AND events.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own event family members" ON event_family_members;
CREATE POLICY "Users can insert their own event family members" ON event_family_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_family_members.event_id
      AND events.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own event family members" ON event_family_members;
CREATE POLICY "Users can update their own event family members" ON event_family_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_family_members.event_id
      AND events.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own event family members" ON event_family_members;
CREATE POLICY "Users can delete their own event family members" ON event_family_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_family_members.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Note: Policies for event_exceptions and exception_family_members are skipped
-- You can add them manually later if needed, based on your actual table structure
