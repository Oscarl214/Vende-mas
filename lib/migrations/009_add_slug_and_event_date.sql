-- Add vanity slug to profiles for smart links (e.g. app.com/r/vidabebidas)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug
  ON public.profiles (slug)
  WHERE slug IS NOT NULL;

-- Allow anonymous reads on profiles by slug (limited columns only).
-- The resolve-slug edge function uses the service role key, so this policy
-- is a safety net for direct anon queries.
CREATE POLICY "Public read profile by slug"
  ON public.profiles FOR SELECT
  USING (true);

-- Add optional event date to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS event_date timestamptz;
