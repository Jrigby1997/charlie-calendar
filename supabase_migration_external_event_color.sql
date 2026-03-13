-- Migration: add color_hex column to external_events
-- Stores the resolved hex color for each synced event so it can be rendered
-- with the correct calendar/event color when the "Custom Colors" mode is active.
-- The value is populated during Google Calendar sync from:
--   1. The event's own colorId (per-event override in Google Calendar)
--   2. The calendar's backgroundColor (inherited when no per-event override)

ALTER TABLE public.external_events
  ADD COLUMN IF NOT EXISTS color_hex text;
