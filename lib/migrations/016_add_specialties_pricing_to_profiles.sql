-- Add specialties and pricing_info fields to profiles for richer AI caption context
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS specialties  text,
  ADD COLUMN IF NOT EXISTS pricing_info text;
