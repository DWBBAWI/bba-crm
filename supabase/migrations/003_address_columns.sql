-- Migrate from single business_address to structured address fields
alter table public.leads
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists zip text;

-- Copy existing business_address into address so no data is lost
update public.leads set address = business_address where business_address is not null;

-- Drop the old column
alter table public.leads drop column if exists business_address;
