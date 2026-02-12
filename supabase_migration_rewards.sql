-- ============================================
-- Rewards System Migration
-- ============================================

-- 1. Rewards table - reward definitions
CREATE TABLE IF NOT EXISTS rewards (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL DEFAULT 1,
  reward_type TEXT NOT NULL DEFAULT 'reusable' CHECK (reward_type IN ('reusable', 'one_off')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own rewards" ON rewards;
DROP POLICY IF EXISTS "Users can insert their own rewards" ON rewards;
DROP POLICY IF EXISTS "Users can update their own rewards" ON rewards;
DROP POLICY IF EXISTS "Users can delete their own rewards" ON rewards;

CREATE POLICY "Users can view their own rewards"
  ON rewards FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rewards"
  ON rewards FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rewards"
  ON rewards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rewards"
  ON rewards FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_active ON rewards(is_active);

-- 2. Reward assignments - which family members can redeem which rewards
CREATE TABLE IF NOT EXISTS reward_assignments (
  id BIGSERIAL PRIMARY KEY,
  reward_id BIGINT NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  family_member_id BIGINT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  UNIQUE(reward_id, family_member_id)
);

ALTER TABLE reward_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reward assignments" ON reward_assignments;
DROP POLICY IF EXISTS "Users can insert their own reward assignments" ON reward_assignments;
DROP POLICY IF EXISTS "Users can update their own reward assignments" ON reward_assignments;
DROP POLICY IF EXISTS "Users can delete their own reward assignments" ON reward_assignments;

CREATE POLICY "Users can view their own reward assignments"
  ON reward_assignments FOR SELECT
  USING (EXISTS (SELECT 1 FROM rewards WHERE rewards.id = reward_assignments.reward_id AND rewards.user_id = auth.uid()));

CREATE POLICY "Users can insert their own reward assignments"
  ON reward_assignments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM rewards WHERE rewards.id = reward_assignments.reward_id AND rewards.user_id = auth.uid()));

CREATE POLICY "Users can update their own reward assignments"
  ON reward_assignments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM rewards WHERE rewards.id = reward_assignments.reward_id AND rewards.user_id = auth.uid()));

CREATE POLICY "Users can delete their own reward assignments"
  ON reward_assignments FOR DELETE
  USING (EXISTS (SELECT 1 FROM rewards WHERE rewards.id = reward_assignments.reward_id AND rewards.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_reward_assignments_reward_id ON reward_assignments(reward_id);
CREATE INDEX IF NOT EXISTS idx_reward_assignments_member_id ON reward_assignments(family_member_id);

-- 3. Reward redemptions - history of when rewards were redeemed
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id BIGSERIAL PRIMARY KEY,
  reward_id BIGINT NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  family_member_id BIGINT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reward redemptions" ON reward_redemptions;
DROP POLICY IF EXISTS "Users can insert their own reward redemptions" ON reward_redemptions;
DROP POLICY IF EXISTS "Users can update their own reward redemptions" ON reward_redemptions;
DROP POLICY IF EXISTS "Users can delete their own reward redemptions" ON reward_redemptions;

CREATE POLICY "Users can view their own reward redemptions"
  ON reward_redemptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM rewards WHERE rewards.id = reward_redemptions.reward_id AND rewards.user_id = auth.uid()));

CREATE POLICY "Users can insert their own reward redemptions"
  ON reward_redemptions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM rewards WHERE rewards.id = reward_redemptions.reward_id AND rewards.user_id = auth.uid()));

CREATE POLICY "Users can update their own reward redemptions"
  ON reward_redemptions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM rewards WHERE rewards.id = reward_redemptions.reward_id AND rewards.user_id = auth.uid()));

CREATE POLICY "Users can delete their own reward redemptions"
  ON reward_redemptions FOR DELETE
  USING (EXISTS (SELECT 1 FROM rewards WHERE rewards.id = reward_redemptions.reward_id AND rewards.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON reward_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_member_id ON reward_redemptions(family_member_id);

-- 4. Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rewards;
ALTER PUBLICATION supabase_realtime ADD TABLE reward_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE reward_redemptions;
