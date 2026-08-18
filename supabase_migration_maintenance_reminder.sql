-- Optional secondary TIME reminder on a maintenance item. Lets a miles- or
-- uses-tracked item also nudge you after a set amount of time ("go at least
-- look, even if the miles aren't up") — e.g. an oil change every 5,000 mi OR
-- every 6 months, whichever comes first.
ALTER TABLE maintenance_items
  ADD COLUMN IF NOT EXISTS reminder_interval DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS reminder_unit TEXT CHECK (reminder_unit IN ('days', 'weeks', 'months'));
