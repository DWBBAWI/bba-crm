-- Migration 013: Prevent double-booked appointments at the database level
-- ============================================================
-- The public booking flow (/api/book) now checks availability before
-- inserting, but a plain "check then insert" from application code still
-- has a race window: two visitors hitting the same slot at the same instant
-- can both pass the check before either request commits.
--
-- An exclusion constraint closes that window atomically — Postgres itself
-- rejects the second overlapping INSERT, regardless of timing. Cancelled
-- appointments don't block a slot, so they're excluded from the guard.
--
-- NOTE: if any existing rows already overlap (possible since nothing
-- enforced this before), this ALTER TABLE will fail on apply. Check first:
--   select a.id, b.id from public.appointments a
--   join public.appointments b on a.rep_id = b.rep_id and a.id < b.id
--   where a.status <> 'cancelled' and b.status <> 'cancelled'
--     and tstzrange(a.start_time, a.end_time) && tstzrange(b.start_time, b.end_time);
-- Resolve any rows that query returns before running this migration.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    rep_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (status <> 'cancelled');
