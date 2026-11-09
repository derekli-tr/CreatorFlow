-- CreatorFlow database schema (baseline: no app tables yet)
-- Paste this whole file into Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run. Section 1 deletes tables from earlier versions of the app.

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


-- No app tables yet. Add them below.
