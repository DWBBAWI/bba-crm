-- Email logs and SMS logs RLS policies
-- Allow the server to insert email/SMS logs for any enrollment
create policy "Server can insert email logs" on public.email_logs
  for insert to authenticated
  with check (true);

create policy "Server can insert SMS logs" on public.sms_logs
  for insert to authenticated
  with check (true);

-- Allow users to view email/SMS logs for their leads
create policy "Users can view email logs for their leads" on public.email_logs
  for select using (
    exists (
      select 1 from public.leads l
      where l.id = lead_id
      and (
        l.assigned_rep_id = auth.uid()
        or exists (
          select 1 from public.users u
          where u.id = auth.uid()
          and u.role in ('owner', 'vp_operations')
        )
      )
    )
  );

create policy "Users can view SMS logs for their leads" on public.sms_logs
  for select using (
    exists (
      select 1 from public.leads l
      where l.id = lead_id
      and (
        l.assigned_rep_id = auth.uid()
        or exists (
          select 1 from public.users u
          where u.id = auth.uid()
          and u.role in ('owner', 'vp_operations')
        )
      )
    )
  );
