-- Add archived_at to posts: NULL = active, non-NULL = archived.
-- Run in Supabase SQL Editor if not yet applied.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.posts.archived_at IS 'When set, post is archived; NULL means active.';
