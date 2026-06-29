-- ============================================================
-- Migration 008: People & Businesses
-- Adds support for owners (people) with multiple business locations.
-- Run in Supabase SQL Editor after 007_gcal_sync.sql.
-- ============================================================

-- ── 1. People (business owners / contacts) ───────────────────────────────────

CREATE TABLE public.people (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       text NOT NULL,
  phone      text,
  email      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- People are a shared resource — any authenticated user can read and create.
-- Access control for sensitive data is enforced at the lead level.
CREATE POLICY "Authenticated users can read people" ON public.people
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert people" ON public.people
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update people" ON public.people
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can delete people" ON public.people
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('owner', 'vp_operations')
    )
  );

-- ── 2. Businesses (locations owned by a person) ───────────────────────────────

CREATE TABLE public.businesses (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id      uuid REFERENCES public.people(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  address       text,
  city          text,
  state         text,
  zip           text,
  industry      text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read businesses" ON public.businesses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert businesses" ON public.businesses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update businesses" ON public.businesses
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can delete businesses" ON public.businesses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('owner', 'vp_operations')
    )
  );

CREATE INDEX businesses_owner_idx ON public.businesses(owner_id);

-- ── 3. Add FK columns to leads ────────────────────────────────────────────────
-- owner_id and business_id are the new source of truth.
-- The original owner_name and business_name columns are kept (and made nullable)
-- for backward compatibility during the UI migration; they can be dropped later.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS owner_id    uuid REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;

-- Make the legacy text fields nullable — new leads will use the FK relationships.
ALTER TABLE public.leads
  ALTER COLUMN owner_name    DROP NOT NULL,
  ALTER COLUMN business_name DROP NOT NULL;

CREATE INDEX leads_owner_id_idx    ON public.leads(owner_id);
CREATE INDEX leads_business_id_idx ON public.leads(business_id);

-- ── 4. Data migration ─────────────────────────────────────────────────────────
-- 4a. One person per unique owner_name.
--     Multiple leads with the same owner_name → single person row.
--     Phone and email: take the first non-null value found (MAX picks arbitrary
--     non-null over null in Postgres when there is only one distinct value;
--     if the same owner has multiple phones/emails across leads we just want any).

WITH new_people AS (
  INSERT INTO public.people (id, name, phone, email, created_at)
  SELECT
    uuid_generate_v4(),
    owner_name,
    MAX(owner_phone),
    MAX(email),
    MIN(created_at)
  FROM public.leads
  WHERE owner_name IS NOT NULL AND owner_name <> ''
  GROUP BY owner_name
  RETURNING id, name
)
UPDATE public.leads l
SET owner_id = np.id
FROM new_people np
WHERE np.name = l.owner_name;

-- 4b. One business per unique (owner, business_name).
--     The same owner_name + different business_name → separate business rows.
--     Address fields: take any non-null value (MAX over multiple matching leads).

WITH new_businesses AS (
  INSERT INTO public.businesses (id, owner_id, business_name, address, city, state, zip, industry, created_at)
  SELECT
    uuid_generate_v4(),
    l.owner_id,
    l.business_name,
    MAX(l.address),
    MAX(l.city),
    MAX(l.state),
    MAX(l.zip),
    MAX(l.industry),
    MIN(l.created_at)
  FROM public.leads l
  WHERE l.business_name IS NOT NULL AND l.business_name <> ''
    AND l.owner_id IS NOT NULL
  GROUP BY l.owner_id, l.business_name
  RETURNING id, owner_id, business_name
)
UPDATE public.leads l
SET business_id = nb.id
FROM new_businesses nb
WHERE nb.owner_id      = l.owner_id
  AND nb.business_name = l.business_name;

-- ── 5. Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
