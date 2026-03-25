-- Special Days table for birthdays, anniversaries, and other countable events
CREATE TABLE IF NOT EXISTS special_days (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  emoji TEXT NOT NULL DEFAULT '⭐',
  color TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE special_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own special days"
  ON special_days FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own special days"
  ON special_days FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own special days"
  ON special_days FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own special days"
  ON special_days FOR DELETE
  USING (auth.uid() = user_id);
