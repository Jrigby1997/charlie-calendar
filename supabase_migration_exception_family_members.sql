-- Add column to store modified family members for event exceptions

ALTER TABLE event_exceptions ADD COLUMN IF NOT EXISTS modified_family_member_ids TEXT;

COMMENT ON COLUMN event_exceptions.modified_family_member_ids IS 'JSON array of family member IDs for this specific instance (overrides base event members)';
