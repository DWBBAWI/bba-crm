-- ============================================================
-- Migration 007: Google Calendar sync columns on appointments
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.appointments
  -- ID of the event in Google Calendar — used for delete-and-reinsert sync
  ADD COLUMN IF NOT EXISTS google_event_id text,
  -- All-day events have a date but no time; we need this flag to avoid
  -- timezone-mangling the date when displaying on the calendar grid
  ADD COLUMN IF NOT EXISTS is_all_day boolean NOT NULL DEFAULT false,
  -- Distinguishes Google-Calendar-sourced rows from manually created ones
  ADD COLUMN IF NOT EXISTS gcal_synced boolean NOT NULL DEFAULT false;

-- Fast lookup during sync (delete old gcal rows before reinserting)
CREATE INDEX IF NOT EXISTS appointments_gcal_sync_idx
  ON public.appointments(rep_id, gcal_synced, start_time)
  WHERE gcal_synced = true;

NOTIFY pgrst, 'reload schema';
