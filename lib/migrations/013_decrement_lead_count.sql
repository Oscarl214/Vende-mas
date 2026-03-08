-- Decrement lead count for current month (so free tier can add another lead after delete).
-- Run in Supabase SQL Editor if not yet applied.
create or replace function public.decrement_lead_count(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(now(), 'YYYY-MM');
begin
  update public.usage
  set
    leads_stored = greatest(0, coalesce(leads_stored, 0) - 1),
    updated_at = now()
  where user_id = p_user_id
    and period = v_period;
end;
$$;
