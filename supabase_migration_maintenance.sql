-- Maintenance tracking: assets (vehicles, appliances, equipment) and the
-- maintenance items under each, tracked by MILES, TIME, or USES.
--   miles → due when (asset.odometer - last_service_odometer) >= interval_value
--   time  → due when today >= last_service_date + interval_value (interval_unit)
--   uses  → due when uses_since_service >= interval_value

CREATE TABLE IF NOT EXISTS maintenance_assets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🔧',
  odometer DOUBLE PRECISION,            -- current mileage (vehicles); null for non-mileage assets
  odometer_updated_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id BIGINT NOT NULL REFERENCES maintenance_assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  track_type TEXT NOT NULL CHECK (track_type IN ('miles', 'time', 'uses')),
  interval_value DOUBLE PRECISION NOT NULL,                              -- miles, # of time units, or # of uses
  interval_unit TEXT CHECK (interval_unit IN ('days', 'weeks', 'months')), -- time only
  last_service_date DATE,                                                -- when last serviced (time + display)
  last_service_odometer DOUBLE PRECISION,                                -- odometer at last service (miles)
  uses_since_service INTEGER NOT NULL DEFAULT 0,                         -- counter (uses)
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_assets_user ON maintenance_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_items_user ON maintenance_items(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_items_asset ON maintenance_items(asset_id);

ALTER TABLE maintenance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own maintenance assets"
  ON maintenance_assets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own maintenance items"
  ON maintenance_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
