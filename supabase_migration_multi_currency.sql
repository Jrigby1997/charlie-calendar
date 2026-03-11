-- =============================================
-- Multi-Currency Rewards Migration
-- =============================================
-- Replaces the single member_points/task.points system with
-- per-currency balances. Existing star data is migrated automatically.

-- 1. Per-member per-currency balance table
CREATE TABLE IF NOT EXISTS member_currency_balances (
  id BIGSERIAL PRIMARY KEY,
  family_member_id BIGINT NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  currency_type TEXT NOT NULL CHECK (currency_type IN ('stars','muscles','heart','game_points','trophy')),
  total_earned INTEGER NOT NULL DEFAULT 0,
  redeemed_amount INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_member_id, currency_type)
);

-- 2. Migrate existing star balances from member_points → member_currency_balances
INSERT INTO member_currency_balances (family_member_id, currency_type, total_earned, redeemed_amount)
SELECT family_member_id, 'stars', total_points, redeemed_points
FROM member_points
ON CONFLICT (family_member_id, currency_type) DO UPDATE
  SET total_earned = EXCLUDED.total_earned,
      redeemed_amount = EXCLUDED.redeemed_amount,
      updated_at = NOW();

-- 3. Per-task per-currency payout table
CREATE TABLE IF NOT EXISTS task_currency_rewards (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  currency_type TEXT NOT NULL CHECK (currency_type IN ('stars','muscles','heart','game_points','trophy')),
  amount INTEGER NOT NULL DEFAULT 1,
  UNIQUE(task_id, currency_type)
);

-- 4. Migrate existing task points → task_currency_rewards (stars)
INSERT INTO task_currency_rewards (task_id, currency_type, amount)
SELECT id, 'stars', points
FROM tasks
WHERE points > 0
ON CONFLICT (task_id, currency_type) DO NOTHING;

-- 5. Add currency_type to rewards table (which currency is spent to redeem)
ALTER TABLE rewards
  ADD COLUMN IF NOT EXISTS currency_type TEXT DEFAULT 'stars'
  CHECK (currency_type IN ('stars','muscles','heart','game_points','trophy'));

-- 6. Also add currency_type to reward_redemptions for history display
ALTER TABLE reward_redemptions
  ADD COLUMN IF NOT EXISTS currency_type TEXT DEFAULT 'stars';

-- 7. RLS: enable for new table (inherits auth from family_members join)
ALTER TABLE member_currency_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_currency_rewards ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own family's data
-- (adjust policies to match your existing RLS setup)
CREATE POLICY "Users can manage their family's currency balances"
  ON member_currency_balances FOR ALL
  USING (
    family_member_id IN (
      SELECT id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their task currency rewards"
  ON task_currency_rewards FOR ALL
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE user_id = auth.uid()
    )
  );
