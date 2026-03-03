-- Add platform column to posts table
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS platform text;

COMMENT ON COLUMN posts.platform IS 'Target platform: facebook, instagram, google_business';
