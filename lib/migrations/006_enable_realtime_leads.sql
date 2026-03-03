-- Enable Supabase Realtime for the leads table so the app
-- receives live INSERT / UPDATE events when leads arrive.
alter publication supabase_realtime add table leads;
