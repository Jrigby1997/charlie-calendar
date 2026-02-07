-- Create event_exceptions table for tracking individual instance modifications/deletions

CREATE TABLE IF NOT EXISTS event_exceptions (
  id BIGSERIAL PRIMARY KEY,
  base_event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  exception_date TEXT NOT NULL, -- Date of the specific instance (YYYY-MM-DD)
  is_deleted BOOLEAN DEFAULT FALSE, -- If true, hide this instance
  modified_title TEXT, -- If set, override the base event's title for this instance
  modified_start_time TEXT, -- If set, override start time
  modified_end_time TEXT, -- If set, override end time
  modified_description TEXT, -- If set, override description
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(base_event_id, exception_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_exceptions_base_event ON event_exceptions(base_event_id);

COMMENT ON TABLE event_exceptions IS 'Tracks exceptions (deleted or modified instances) for recurring events';
COMMENT ON COLUMN event_exceptions.base_event_id IS 'The recurring event this exception belongs to';
COMMENT ON COLUMN event_exceptions.exception_date IS 'The specific date of the instance being modified/deleted';
COMMENT ON COLUMN event_exceptions.is_deleted IS 'If true, this instance should not be shown';
COMMENT ON COLUMN event_exceptions.modified_title IS 'Override title for this specific instance';
