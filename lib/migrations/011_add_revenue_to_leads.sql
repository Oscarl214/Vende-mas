-- Add revenue column to leads for tracking how much money each lead generated.
-- Run in Supabase SQL Editor if not yet applied.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS revenue numeric DEFAULT NULL;

COMMENT ON COLUMN public.leads.revenue IS 'Dollar amount earned from this lead (set when booked or closed)';
