-- Shared family notepad (one row per user/family)
CREATE TABLE IF NOT EXISTS family_notes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE family_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own family notes"
  ON family_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own family notes"
  ON family_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own family notes"
  ON family_notes FOR UPDATE
  USING (auth.uid() = user_id);
