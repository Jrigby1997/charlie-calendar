-- Add admin_pin_hash column to app_settings
-- NULL  = no PIN required (Settings are open to everyone)
-- TEXT  = SHA-256 hex hash of the 4-digit PIN (computed client-side via Web Crypto API)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS admin_pin_hash TEXT;

COMMENT ON COLUMN app_settings.admin_pin_hash IS
  'SHA-256 hex hash of the admin PIN. NULL means no PIN is set and Settings are open to all users.';
