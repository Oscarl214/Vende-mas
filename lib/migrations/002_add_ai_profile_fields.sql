-- Add AI content profile fields to profiles table
ALTER TABLE public.profiles
  ADD COLUMN services_offered text,
  ADD COLUMN target_customer text,
  ADD COLUMN tone text DEFAULT 'friendly',
  ADD COLUMN default_language text DEFAULT 'es';
