-- Google Calendar Integration Migration
-- Creates tables for OAuth tokens, external calendar configs, and cached external events
-- Run this in your Supabase SQL editor

-- ============================================================
-- TABLE: user_integrations
-- Stores OAuth tokens per user, per provider (e.g. 'google')
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider          text NOT NULL DEFAULT 'google',
  access_token      text NOT NULL,
  refresh_token     text,
  token_expires_at  timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own integrations"
  ON public.user_integrations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: external_calendars
-- One row per connected Google calendar per user.
-- family_member_id assignment controls which color it renders with.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.external_calendars (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider              text NOT NULL DEFAULT 'google',
  external_calendar_id  text NOT NULL,                           -- Google calendarId (e.g. 'primary' or email)
  calendar_name         text NOT NULL,
  calendar_color        text,                                    -- Google hex color, e.g. '#4285F4'
  is_enabled            boolean NOT NULL DEFAULT true,
  family_member_id      bigint REFERENCES public.family_members(id) ON DELETE SET NULL,
  last_synced_at        timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, external_calendar_id)
);

ALTER TABLE public.external_calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own external calendars"
  ON public.external_calendars
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: external_events
-- Cached events synced from external providers (Google Calendar).
-- Mirrors the shape of the local 'events' table for easy rendering.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.external_events (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_calendar_id  text NOT NULL,                           -- Google calendarId (matches external_calendars.external_calendar_id)
  external_event_id     text NOT NULL,                           -- Google event ID (for future two-way sync mapping)
  title                 text NOT NULL DEFAULT '',
  date                  date NOT NULL,                           -- start date
  end_date              date,                                    -- for multi-day events
  start_time            text,                                    -- 'HH:MM' 24hr, NULL for all-day events
  end_time              text,                                    -- 'HH:MM' 24hr, NULL for all-day events
  description           text NOT NULL DEFAULT '',
  is_all_day            boolean NOT NULL DEFAULT false,
  provider              text NOT NULL DEFAULT 'google',
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, external_event_id)
);

ALTER TABLE public.external_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own external events"
  ON public.external_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- INDEXES for query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_external_events_user_date
  ON public.external_events (user_id, date);

CREATE INDEX IF NOT EXISTS idx_external_events_calendar
  ON public.external_events (user_id, external_calendar_id);

CREATE INDEX IF NOT EXISTS idx_external_calendars_user
  ON public.external_calendars (user_id);
