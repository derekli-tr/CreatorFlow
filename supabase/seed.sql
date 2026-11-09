-- Optional sample data for demos.
-- 1. Sign up in the app first.
-- 2. Replace the email below with your account's email.
-- 3. Paste into Supabase Dashboard → SQL Editor → New query → Run.
-- Re-running replaces that account's deals with this sample set.

do $$
declare
  me uuid := (select id from auth.users where email = 'you@example.com');
begin
  if me is null then
    raise exception 'No account found for that email. Sign up in the app first, then edit the email in seed.sql.';
  end if;

  delete from public.deals where owner_id = me;

  insert into public.deals (owner_id, brand, amount, platform, stage, position, paid_at) values
    (me, 'Notion',      0,    'YouTube',   'pitching',         10, null),
    (me, 'Glossier',    1500, 'Instagram', 'pitching',         9,  null),
    (me, 'Duolingo',    2400, 'TikTok',    'in_production',    8,  null),
    (me, 'Squarespace', 4000, 'YouTube',   'in_production',    7,  null),
    (me, 'HelloFresh',  3200, 'Instagram', 'awaiting_payment', 6,  null),
    (me, 'Audible',     1800, 'TikTok',    'awaiting_payment', 5,  null),
    (me, 'Skillshare',  2500, 'YouTube',   'paid',             4,  now() - interval '3 days'),
    (me, 'Canva',       1200, 'Instagram', 'paid',             3,  now() - interval '1 month'),
    (me, 'NordVPN',     5000, 'YouTube',   'paid',             2,  now() - interval '2 months'),
    (me, 'Gymshark',    900,  'TikTok',    'paid',             1,  now() - interval '4 months');
end;
$$;
