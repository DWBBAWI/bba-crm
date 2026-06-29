-- ============================================================
-- Migration 009: Commission Tracking System
-- ============================================================
-- Tables (in dependency order):
--   1. payment_processors  — master list of processors
--   2. businesses.processor_id FK  — links each business to its processor
--   3. commission_rates    — per-deal commission % per rep
--   4. monthly_processor_payments — what each processor paid each month
--   5. commission_records  — owed / paid totals per rep per month
--   6. commission_line_items — line-by-line deal breakdown inside a record
-- ============================================================


-- ── 1. Payment Processors ────────────────────────────────────────────────────
-- Master registry of processors (Shift4, Clover, etc.).
-- deposit_day: day of month the processor typically deposits commissions.
-- commission_pct: default % of gross residuals the company keeps (e.g. 85.00).

CREATE TABLE public.payment_processors (
  id             uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name           text        NOT NULL UNIQUE,
  deposit_day    int         NOT NULL DEFAULT 15 CHECK (deposit_day BETWEEN 1 AND 31),
  commission_pct numeric(5,2) NOT NULL DEFAULT 85.00 CHECK (commission_pct > 0 AND commission_pct <= 100),
  active         boolean     DEFAULT true,
  notes          text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Seed the processors we already know about
INSERT INTO public.payment_processors (name, deposit_day, commission_pct) VALUES
  ('Shift4',        15, 85.00),
  ('Clover',        20, 85.00),
  ('Dejavoo',       15, 85.00),
  ('Stackably',     15, 85.00),
  ('Spot On',       15, 85.00),
  ('Basic Terminal', 15, 85.00);


-- ── 2. Businesses → Processor FK ─────────────────────────────────────────────

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS processor_id uuid REFERENCES public.payment_processors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS businesses_processor_idx ON public.businesses(processor_id);


-- ── 3. Commission Rates ───────────────────────────────────────────────────────
-- Stores the agreed commission % for a rep on a specific deal (lead).
-- Multiple rows per lead allow split commissions between reps.
-- commission_percentage: the rep's share of residuals (e.g. 50.00 = 50%).

CREATE TABLE public.commission_rates (
  id                    uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id               uuid        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  rep_id                uuid        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  processor_id          uuid        REFERENCES public.payment_processors(id) ON DELETE SET NULL,
  commission_percentage numeric(5,2) NOT NULL CHECK (commission_percentage > 0 AND commission_percentage <= 100),
  notes                 text,
  created_at            timestamptz DEFAULT now(),
  -- Prevent duplicate rates for the same rep on the same lead+processor combo
  UNIQUE (lead_id, rep_id, processor_id)
);

CREATE INDEX commission_rates_lead_idx     ON public.commission_rates(lead_id);
CREATE INDEX commission_rates_rep_idx      ON public.commission_rates(rep_id);
CREATE INDEX commission_rates_processor_idx ON public.commission_rates(processor_id);


-- ── 4. Monthly Processor Payments ────────────────────────────────────────────
-- Records what each processor actually paid the company in a given month.
-- processor is stored as text (denormalized) so historical records survive
-- processor renames or deletions.
-- UNIQUE(processor, year, month) prevents double-entry for the same period.

CREATE TABLE public.monthly_processor_payments (
  id               uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  processor        text        NOT NULL,
  year             int         NOT NULL CHECK (year >= 2020),
  month            int         NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_amount_paid numeric(12,2) NOT NULL CHECK (total_amount_paid >= 0),
  date_received    date,
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (processor, year, month)
);

CREATE INDEX monthly_processor_payments_period_idx ON public.monthly_processor_payments(year, month);
CREATE INDEX monthly_processor_payments_proc_idx   ON public.monthly_processor_payments(processor);


-- ── 5. Commission Records ─────────────────────────────────────────────────────
-- One row per rep per calendar month.
-- total_owed is computed from line items; total_paid is updated as payments are made.
-- status: 'pending' → some/all unpaid; 'partial' → partially paid; 'paid' → fully paid.

CREATE TABLE public.commission_records (
  id          uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  rep_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  year        int         NOT NULL CHECK (year >= 2020),
  month       int         NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_owed  numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_owed >= 0),
  total_paid  numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_paid >= 0),
  status      text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  paid_date   timestamptz,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (rep_id, year, month)
);

CREATE INDEX commission_records_rep_idx    ON public.commission_records(rep_id);
CREATE INDEX commission_records_period_idx ON public.commission_records(year, month);
CREATE INDEX commission_records_status_idx ON public.commission_records(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_commission_record_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER commission_records_updated_at
  BEFORE UPDATE ON public.commission_records
  FOR EACH ROW EXECUTE FUNCTION update_commission_record_updated_at();

-- Auto-compute status based on paid vs owed amounts
CREATE OR REPLACE FUNCTION sync_commission_record_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_owed = 0 THEN
    NEW.status := 'pending';
  ELSIF NEW.total_paid = 0 THEN
    NEW.status := 'pending';
  ELSIF NEW.total_paid >= NEW.total_owed THEN
    NEW.status := 'paid';
    IF NEW.paid_date IS NULL THEN NEW.paid_date := now(); END IF;
  ELSE
    NEW.status := 'partial';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER commission_records_sync_status
  BEFORE INSERT OR UPDATE OF total_owed, total_paid ON public.commission_records
  FOR EACH ROW EXECUTE FUNCTION sync_commission_record_status();


-- ── 6. Commission Line Items ──────────────────────────────────────────────────
-- One row per deal contribution inside a commission record.
-- processor stored as text (same reason as monthly_processor_payments).
-- amount_from_processor: total residual the company received for this deal that month.
-- commission_rate: the percentage applied (copied from commission_rates at creation time).
-- commission_amount: amount_from_processor × (commission_rate / 100).

CREATE TABLE public.commission_line_items (
  id                    uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  commission_record_id  uuid        NOT NULL REFERENCES public.commission_records(id) ON DELETE CASCADE,
  lead_id               uuid        REFERENCES public.leads(id)      ON DELETE SET NULL,
  business_id           uuid        REFERENCES public.businesses(id)  ON DELETE SET NULL,
  processor             text        NOT NULL,
  amount_from_processor numeric(12,2) NOT NULL CHECK (amount_from_processor >= 0),
  commission_rate       numeric(5,2)  NOT NULL CHECK (commission_rate > 0 AND commission_rate <= 100),
  commission_amount     numeric(12,2) NOT NULL CHECK (commission_amount >= 0),
  notes                 text,
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX commission_line_items_record_idx   ON public.commission_line_items(commission_record_id);
CREATE INDEX commission_line_items_lead_idx     ON public.commission_line_items(lead_id);
CREATE INDEX commission_line_items_business_idx ON public.commission_line_items(business_id);

-- When a line item is inserted/updated/deleted, recalculate the parent record's total_owed.
CREATE OR REPLACE FUNCTION recalc_commission_record_total()
RETURNS TRIGGER AS $$
DECLARE
  rec_id uuid;
BEGIN
  rec_id := COALESCE(NEW.commission_record_id, OLD.commission_record_id);
  UPDATE public.commission_records
  SET total_owed = (
    SELECT COALESCE(SUM(commission_amount), 0)
    FROM public.commission_line_items
    WHERE commission_record_id = rec_id
  )
  WHERE id = rec_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER commission_line_items_recalc
  AFTER INSERT OR UPDATE OF commission_amount OR DELETE
  ON public.commission_line_items
  FOR EACH ROW EXECUTE FUNCTION recalc_commission_record_total();


-- ── 7. RLS Policies ──────────────────────────────────────────────────────────

ALTER TABLE public.payment_processors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_processor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_line_items     ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an admin?
-- (Inline sub-selects used throughout to avoid a separate function dependency.)

-- payment_processors: all authenticated can read; only admins can write
CREATE POLICY "Anyone can read processors" ON public.payment_processors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert processors" ON public.payment_processors
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner','vp_operations')
  ));

CREATE POLICY "Admins can update processors" ON public.payment_processors
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner','vp_operations')
  ));

CREATE POLICY "Admins can delete processors" ON public.payment_processors
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner','vp_operations')
  ));

-- commission_rates: admins see all; reps see their own
CREATE POLICY "Admins can manage commission rates" ON public.commission_rates
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner','vp_operations')
  ));

CREATE POLICY "Reps can read their own rates" ON public.commission_rates
  FOR SELECT TO authenticated
  USING (rep_id = auth.uid());

-- monthly_processor_payments: admins only (contains company-level financials)
CREATE POLICY "Admins can manage processor payments" ON public.monthly_processor_payments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner','vp_operations')
  ));

-- commission_records: admins see all; reps see their own row
CREATE POLICY "Admins can manage commission records" ON public.commission_records
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner','vp_operations')
  ));

CREATE POLICY "Reps can read their own commission record" ON public.commission_records
  FOR SELECT TO authenticated
  USING (rep_id = auth.uid());

-- commission_line_items: admins see all; reps see items that belong to their record
CREATE POLICY "Admins can manage line items" ON public.commission_line_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner','vp_operations')
  ));

CREATE POLICY "Reps can read their own line items" ON public.commission_line_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.commission_records cr
    WHERE cr.id = commission_record_id AND cr.rep_id = auth.uid()
  ));


-- ── 8. Updated-at trigger for payment_processors ─────────────────────────────

CREATE OR REPLACE FUNCTION update_payment_processors_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_processors_updated_at
  BEFORE UPDATE ON public.payment_processors
  FOR EACH ROW EXECUTE FUNCTION update_payment_processors_updated_at();

CREATE TRIGGER monthly_processor_payments_updated_at
  BEFORE UPDATE ON public.monthly_processor_payments
  FOR EACH ROW EXECUTE FUNCTION update_payment_processors_updated_at();


-- ── 9. Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
