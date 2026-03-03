-- ============================================================
-- Subscription tier system: tables, RLS, functions, triggers
-- ============================================================

-- 1. Enum for subscription tiers
create type subscription_tier as enum ('free', 'pro');

-- 2. Subscriptions table
create table public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  tier          subscription_tier not null default 'free',
  revenuecat_customer_id text,
  product_id    text,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint subscriptions_user_id_unique unique (user_id)
);

alter table public.subscriptions enable row level security;

create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can update own subscription"
  on public.subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Usage table (monthly counters)
create table public.usage (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  period          text not null, -- YYYY-MM
  posts_generated integer not null default 0,
  leads_stored    integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint usage_user_period_unique unique (user_id, period)
);

alter table public.usage enable row level security;

create policy "Users can read own usage"
  on public.usage for select
  using (auth.uid() = user_id);

create policy "Users can upsert own usage"
  on public.usage for insert
  with check (auth.uid() = user_id);

create policy "Users can update own usage"
  on public.usage for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Auto-create free subscription for new users
create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, tier)
  values (new.id, 'free');

  insert into public.usage (user_id, period, posts_generated, leads_stored)
  values (new.id, to_char(now(), 'YYYY-MM'), 0, 0);

  return new;
end;
$$;

create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_user_subscription();

-- 5. Server-side limit checks

-- Returns true if the user can generate another post this month
create or replace function public.check_can_generate_post(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier subscription_tier;
  v_count integer;
  v_period text := to_char(now(), 'YYYY-MM');
begin
  select tier into v_tier from public.subscriptions where user_id = p_user_id;
  if v_tier = 'pro' then
    return true;
  end if;

  select coalesce(posts_generated, 0) into v_count
    from public.usage
    where user_id = p_user_id and period = v_period;

  return coalesce(v_count, 0) < 3;
end;
$$;

-- Returns true if the user can store another lead
create or replace function public.check_can_store_lead(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier subscription_tier;
  v_count integer;
begin
  select tier into v_tier from public.subscriptions where user_id = p_user_id;
  if v_tier = 'pro' then
    return true;
  end if;

  select coalesce(leads_stored, 0) into v_count
    from public.usage
    where user_id = p_user_id
      and period = to_char(now(), 'YYYY-MM');

  return coalesce(v_count, 0) < 5;
end;
$$;

-- Increment post count for current month (upserts usage row)
create or replace function public.increment_post_count(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(now(), 'YYYY-MM');
begin
  insert into public.usage (user_id, period, posts_generated, leads_stored)
  values (p_user_id, v_period, 1, 0)
  on conflict (user_id, period)
  do update set
    posts_generated = public.usage.posts_generated + 1,
    updated_at = now();
end;
$$;

-- Increment lead count for current month (upserts usage row)
create or replace function public.increment_lead_count(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(now(), 'YYYY-MM');
begin
  insert into public.usage (user_id, period, posts_generated, leads_stored)
  values (p_user_id, v_period, 0, 1)
  on conflict (user_id, period)
  do update set
    leads_stored = public.usage.leads_stored + 1,
    updated_at = now();
end;
$$;
