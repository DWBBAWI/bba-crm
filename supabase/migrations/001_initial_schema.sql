-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null unique,
  role text not null default 'salesperson' check (role in ('owner', 'vp_operations', 'salesperson')),
  smtp_host text,
  smtp_port integer default 587,
  smtp_user text,
  smtp_pass text,
  twilio_number text,
  google_calendar_token jsonb,
  avatar_url text,
  created_at timestamptz default now()
);

-- Pipeline stages reference
create table public.pipeline_stages (
  id serial primary key,
  name text not null unique,
  "order" integer not null
);

insert into public.pipeline_stages (name, "order") values
  ('New Lead', 1),
  ('Contacted', 2),
  ('Appointment Set', 3),
  ('Contract Sent', 4),
  ('Signed', 5),
  ('Equipment Ordered', 6),
  ('Install Scheduled', 7),
  ('Active Client', 8);

-- Leads / Clients
create table public.leads (
  id uuid default uuid_generate_v4() primary key,
  business_name text not null,
  owner_name text not null,
  business_address text,
  owner_phone text,
  business_phone text,
  email text,
  industry text,
  monthly_processing_volume numeric(12,2),
  current_processor text,
  current_rate numeric(5,4),
  pos_system text check (pos_system in ('Shift4 Dine','Stackably','Clover','Dejavoo','Spot On','Basic Terminal')),
  lead_source text check (lead_source in ('Referral','Cold Call','Cold Email','Other')),
  referred_by text,
  referral_bonus_amount numeric(10,2),
  referral_bonus_paid boolean default false,
  assigned_rep_id uuid references public.users(id),
  last_contacted date,
  next_follow_up date,
  install_date date,
  contract_expiration date,
  active_campaign_name text,
  active_campaign_step integer default 0,
  notes text,
  pipeline_stage text not null default 'New Lead',
  status text not null default 'Prospect' check (status in ('Prospect','Active Client','Inactive')),
  lat numeric(10,7),
  lng numeric(10,7),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Documents
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete cascade,
  name text not null,
  label text not null default 'Other' check (label in ('Contract','Equipment Photo','ID','Other')),
  url text not null,
  uploaded_at timestamptz default now()
);

-- Tasks
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete set null,
  assigned_to uuid references public.users(id),
  title text not null,
  type text not null default 'Follow Up' check (type in ('Call','Email','Follow Up','Meeting','Other')),
  due_date timestamptz not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- Campaigns
create table public.campaigns (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text not null,
  description text,
  created_at timestamptz default now()
);

-- Campaign steps
create table public.campaign_steps (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  step_number integer not null,
  type text not null check (type in ('email','sms')),
  delay_days integer not null default 0,
  subject text,
  body text not null,
  unique(campaign_id, step_number)
);

-- Campaign enrollments
create table public.campaign_enrollments (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  current_step integer not null default 1,
  status text not null default 'active' check (status in ('active','paused','completed','unsubscribed')),
  enrolled_at timestamptz default now()
);

-- Email logs
create table public.email_logs (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete cascade,
  campaign_enrollment_id uuid references public.campaign_enrollments(id) on delete set null,
  subject text not null,
  sent_at timestamptz default now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz
);

-- SMS logs
create table public.sms_logs (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete cascade,
  message text not null,
  sent_at timestamptz default now(),
  direction text not null default 'outbound' check (direction in ('inbound','outbound'))
);

-- Appointments
create table public.appointments (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete set null,
  rep_id uuid references public.users(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  title text not null,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show'))
);

-- Activity log
create table public.activity_log (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete cascade,
  user_id uuid references public.users(id),
  action text not null,
  details text,
  created_at timestamptz default now()
);

-- Indexes
create index leads_assigned_rep_id_idx on public.leads(assigned_rep_id);
create index leads_pipeline_stage_idx on public.leads(pipeline_stage);
create index leads_status_idx on public.leads(status);
create index leads_next_follow_up_idx on public.leads(next_follow_up);
create index leads_contract_expiration_idx on public.leads(contract_expiration);
create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index tasks_due_date_idx on public.tasks(due_date);
create index activity_log_lead_id_idx on public.activity_log(lead_id);
create index activity_log_created_at_idx on public.activity_log(created_at desc);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
  before update on public.leads
  for each row execute function update_updated_at();

-- RLS Policies
alter table public.users enable row level security;
alter table public.leads enable row level security;
alter table public.tasks enable row level security;
alter table public.documents enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_steps enable row level security;
alter table public.campaign_enrollments enable row level security;
alter table public.email_logs enable row level security;
alter table public.sms_logs enable row level security;
alter table public.appointments enable row level security;
alter table public.activity_log enable row level security;

-- Users can read their own profile; admins see all
create policy "Users can read own profile" on public.users
  for select using (auth.uid() = id);

-- Admins can see all users
create policy "Admins can read all users" on public.users
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('owner','vp_operations')
    )
  );

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Leads: reps see own, admins see all
create policy "Admins see all leads" on public.leads
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('owner','vp_operations')
    )
  );

create policy "Reps see own leads" on public.leads
  for all using (assigned_rep_id = auth.uid());

-- Tasks: reps see own, admins see all
create policy "Admins see all tasks" on public.tasks
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('owner','vp_operations')
    )
  );

create policy "Reps see own tasks" on public.tasks
  for all using (assigned_to = auth.uid());

-- Open read on campaigns/steps
create policy "All can read campaigns" on public.campaigns for select using (true);
create policy "All can read campaign_steps" on public.campaign_steps for select using (true);
create policy "Admins manage campaigns" on public.campaigns for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('owner','vp_operations'))
);

-- Documents follow lead access
create policy "Documents follow lead access" on public.documents
  for all using (
    exists (
      select 1 from public.leads l
      where l.id = lead_id
      and (
        l.assigned_rep_id = auth.uid() or
        exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('owner','vp_operations'))
      )
    )
  );

-- Activity log
create policy "Activity log access" on public.activity_log
  for select using (
    user_id = auth.uid() or
    exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('owner','vp_operations'))
  );

create policy "Insert activity log" on public.activity_log
  for insert with check (auth.uid() is not null);

-- Appointments
create policy "Appointments access" on public.appointments
  for all using (
    rep_id = auth.uid() or
    exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('owner','vp_operations'))
  );

-- Email/SMS logs follow lead access
create policy "Email logs access" on public.email_logs for select using (
  exists (
    select 1 from public.leads l where l.id = lead_id
    and (l.assigned_rep_id = auth.uid() or
      exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('owner','vp_operations')))
  )
);

create policy "SMS logs access" on public.sms_logs for select using (
  exists (
    select 1 from public.leads l where l.id = lead_id
    and (l.assigned_rep_id = auth.uid() or
      exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('owner','vp_operations')))
  )
);

-- Initial seed: insert the 3 users (run after creating auth users in Supabase dashboard)
-- insert into public.users (id, name, email, role) values
--   ('<shanon_auth_id>', 'Shanon Boos', 'shanon@breakthroughba.com', 'owner'),
--   ('<doug_auth_id>', 'Doug Williams', 'doug@breakthroughba.com', 'vp_operations'),
--   ('<hardip_auth_id>', 'Hardip', 'hardip@breakthroughba.com', 'salesperson');
