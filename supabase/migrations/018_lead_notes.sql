-- Create lead_notes table for timestamped notes (call logs, site visits, etc.)
create table public.lead_notes (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete set null,
  note_type text not null check (note_type in ('call', 'site_visit', 'email', 'meeting', 'other')),
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.lead_notes enable row level security;

-- Allow users to view notes for leads they have access to
create policy "Users can view lead notes" on public.lead_notes
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

-- Allow users to insert notes for leads they have access to
create policy "Users can insert lead notes" on public.lead_notes
  for insert to authenticated
  with check (
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
    and user_id = auth.uid()
  );

-- Allow users to update/delete their own notes
create policy "Users can update their own notes" on public.lead_notes
  for update to authenticated
  using (user_id = auth.uid());

create policy "Users can delete their own notes" on public.lead_notes
  for delete to authenticated
  using (user_id = auth.uid());
