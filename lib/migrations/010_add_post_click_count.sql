-- Add click count to posts for per-post link tracking.
-- Required for: Posts tab metrics, log-post-click edge function. Run in Supabase SQL Editor if not yet applied.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.posts.click_count IS 'Number of times the post tracking link was opened (form load with ?post=)';
