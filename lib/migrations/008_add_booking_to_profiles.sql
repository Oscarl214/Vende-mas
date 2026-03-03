-- Add booking preference: external link vs in-app lead form.
-- booking_type = 'external' → they use their own link (booking_url required).
-- booking_type = 'internal' → they use the app lead form (booking_url not used).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS booking_type text CHECK (booking_type IN ('external', 'internal')),
  ADD COLUMN IF NOT EXISTS booking_url text;
