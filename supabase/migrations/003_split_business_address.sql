-- Split business_address into four separate fields
alter table public.leads
  add column if not exists address text,
  add column if not exists city    text,
  add column if not exists state   text,
  add column if not exists zip     text;

-- Migrate existing data: put the old value into address so nothing is lost
update public.leads
  set address = business_address
  where business_address is not null and address is null;

alter table public.leads
  drop column if exists business_address;
