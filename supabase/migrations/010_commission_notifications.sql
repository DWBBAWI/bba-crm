-- Migration 010: Commission Notification Tracking
-- Stores per-user dismissals for commission reminder alerts so they survive page reloads.

CREATE TABLE IF NOT EXISTS public.commission_notifications (
  id           uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type         text        NOT NULL CHECK (type IN ('commission_entry', 'commission_unpaid')),
  year         int         NOT NULL CHECK (year >= 2020),
  month        int         NOT NULL CHECK (month BETWEEN 1 AND 12),
  dismissed    boolean     NOT NULL DEFAULT false,
  dismissed_at timestamptz,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, type, year, month)
);

ALTER TABLE public.commission_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications" ON public.commission_notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX commission_notifications_user_idx   ON public.commission_notifications(user_id);
CREATE INDEX commission_notifications_period_idx ON public.commission_notifications(year, month);

NOTIFY pgrst, 'reload schema';
