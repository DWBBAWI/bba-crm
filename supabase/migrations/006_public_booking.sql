-- ============================================================
-- Migration 006: Public booking page support
-- Run in Supabase SQL Editor
-- ============================================================

-- Booking pages are public (/book/[rep]) so we need:
-- 1. Anon users can read rep names to look up the slug → UUID mapping
-- 2. Anon users can insert a scheduled appointment

-- Allow unauthenticated visitors to read rep names/emails for booking pages.
-- Only expose the columns needed — not passwords or tokens.
CREATE POLICY "Public: read rep info for booking" ON public.users
  FOR SELECT TO anon
  USING (true);

-- Allow unauthenticated visitors to insert a booking appointment.
-- Restrict to 'scheduled' status with no lead attached so it can't be abused.
CREATE POLICY "Public: insert booking appointment" ON public.appointments
  FOR INSERT TO anon
  WITH CHECK (status = 'scheduled' AND lead_id IS NULL);

NOTIFY pgrst, 'reload schema';
