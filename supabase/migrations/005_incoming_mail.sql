-- ============================================================
-- Migration 005: Per-user incoming mail (IMAP / POP3) + smtp_ssl
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE public.users
  -- Outgoing: explicit SSL flag (replaces the "port === 465" heuristic)
  ADD COLUMN IF NOT EXISTS smtp_ssl boolean NOT NULL DEFAULT false,

  -- Which incoming protocol this user has chosen
  ADD COLUMN IF NOT EXISTS incoming_mail_protocol text
    CHECK (incoming_mail_protocol IN ('imap', 'pop3')),

  -- IMAP credentials
  ADD COLUMN IF NOT EXISTS imap_host text,
  ADD COLUMN IF NOT EXISTS imap_port integer DEFAULT 993,
  ADD COLUMN IF NOT EXISTS imap_user text,
  ADD COLUMN IF NOT EXISTS imap_pass text,
  ADD COLUMN IF NOT EXISTS imap_ssl boolean NOT NULL DEFAULT true,

  -- POP3 credentials
  ADD COLUMN IF NOT EXISTS pop_host text,
  ADD COLUMN IF NOT EXISTS pop_port integer DEFAULT 995,
  ADD COLUMN IF NOT EXISTS pop_user text,
  ADD COLUMN IF NOT EXISTS pop_pass text,
  ADD COLUMN IF NOT EXISTS pop_ssl boolean NOT NULL DEFAULT true;

-- Refresh PostgREST schema cache so the new columns are immediately usable
NOTIFY pgrst, 'reload schema';
