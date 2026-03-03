-- Create a public storage bucket for the lead capture form
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-forms', 'lead-forms', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read files from the lead-forms bucket
CREATE POLICY "Public read access for lead forms"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lead-forms');
