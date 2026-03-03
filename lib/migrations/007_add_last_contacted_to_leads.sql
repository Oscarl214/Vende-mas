-- Add last_contacted_at for follow-up reminder logic (Pro).
-- When status is set to 'contacted', we set this to now(); reminders use it for "contacted + 3 days" rule.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz DEFAULT NULL;
