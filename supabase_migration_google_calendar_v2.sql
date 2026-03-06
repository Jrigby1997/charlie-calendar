-- Google Calendar Multi-Account + Multi-Member Migration
-- Run this AFTER supabase_migration_google_calendar.sql
-- Adds: google_email (multi-account support), integration_id FK, family_member_ids (JSON array)

-- ============================================================
-- user_integrations: add google_email column for multi-account
-- ============================================================
ALTER TABLE public.user_integrations
  ADD COLUMN IF NOT EXISTS google_email text;

-- Drop the old single-provider unique constraint
ALTER TABLE public.user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_user_id_provider_key;

-- New constraint allows one row per (user, provider, google_email) account
ALTER TABLE public.user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_user_id_provider_email_key;

ALTER TABLE public.user_integrations
  ADD CONSTRAINT user_integrations_user_id_provider_email_key
  UNIQUE (user_id, provider, google_email);

-- ============================================================
-- external_calendars: link to integration + multi-member support
-- ============================================================

-- Link each calendar to the specific Google account that owns it
ALTER TABLE public.external_calendars
  ADD COLUMN IF NOT EXISTS integration_id bigint REFERENCES public.user_integrations(id) ON DELETE CASCADE;

-- Replace single family_member_id with a JSON array of member IDs
ALTER TABLE public.external_calendars
  ADD COLUMN IF NOT EXISTS family_member_ids text NOT NULL DEFAULT '[]';

-- Migrate any existing single-member assignments to the new array format
UPDATE public.external_calendars
  SET family_member_ids = json_build_array(family_member_id)::text
  WHERE family_member_id IS NOT NULL
    AND family_member_ids = '[]';

-- Drop the old single-member column
ALTER TABLE public.external_calendars
  DROP COLUMN IF EXISTS family_member_id;

-- Index for account-grouped calendar lookups
CREATE INDEX IF NOT EXISTS idx_external_calendars_integration
  ON public.external_calendars (integration_id);

-- ============================================================
-- Backfill integration_id on calendars created before v2
-- (Each user had at most one Google integration, so this is safe)
-- ============================================================
UPDATE public.external_calendars ec
SET integration_id = ui.id
FROM public.user_integrations ui
WHERE ec.integration_id IS NULL
  AND ec.provider = 'google'
  AND ui.provider = 'google';
