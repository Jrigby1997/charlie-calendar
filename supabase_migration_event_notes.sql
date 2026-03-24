-- Add checklist support to events
-- Each checklist item: { text: string, checked: boolean }
ALTER TABLE events ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';
