-- CreatorFlow database schema
-- Paste this whole file into Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run, but it RECREATES the deals table (see section 1).

-- ─────────────────────────────────────────────────────────────
-- 1. Clean slate
--    WARNING: permanently deletes these tables and any rows in them.
--    Your login accounts (auth.users) are NOT touched.
-- ─────────────────────────────────────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

drop table if exists
  public.deal_events,
  public.deal_payments,
  public.deals,
  -- tables from the original FreelanceFlow schema
  public.payments,
  public.tasks,
  public.communication_logs,
  public.calendar_events,
  public.notifications,
  public.proposals,
  public.invoices,
  public.projects,
  public.clients,
  public.profiles
cascade;

drop function if exists public.set_updated_at() cascade;
drop function if exists public.deals_before_write() cascade;
drop function if exists public.deals_enforce_workflow() cascade;
drop function if exists public.deals_log_events() cascade;
drop function if exists public.deal_payments_before_insert() cascade;
drop function if exists public.deal_payments_before_delete() cascade;
drop function if exists public.deal_payments_log_events() cascade;
drop function if exists public.deal_received(uuid) cascade;
drop function if exists public.money_text(numeric) cascade;
drop function if exists public.allowed_next_stages(text) cascade;
drop function if exists public.stage_label(text) cascade;

-- ─────────────────────────────────────────────────────────────
-- 2. Deals
-- ─────────────────────────────────────────────────────────────
create table public.deals (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  brand      text not null check (length(trim(brand)) > 0),
  amount     numeric(12, 2) not null default 0 check (amount >= 0),
  platform   text not null default 'Instagram'
             check (platform in ('Instagram', 'TikTok', 'YouTube', 'Twitch', 'X', 'Other')),
  stage      text not null default 'pitching'
             check (stage in ('pitching', 'in_production', 'awaiting_payment', 'paid')),
  -- Higher position = nearer the top of its column
  position   double precision not null default (extract(epoch from now()) * 1000),
  paid_at    timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deals_owner_id_idx on public.deals (owner_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. Row-level security: each user only sees their own deals
-- ─────────────────────────────────────────────────────────────
alter table public.deals enable row level security;

create policy "Owner full access" on public.deals
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
