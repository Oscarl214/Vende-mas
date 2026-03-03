-- Run this SQL in your Supabase Dashboard > SQL Editor

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  business_name text,
  business_type text,
  location text,
  logo_url text,
  brand_colors jsonb default '{}',
  contact_phone text,
  contact_email text,
  website text,
  profile_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, contact_email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a storage bucket for logos
insert into storage.buckets (id, name, public) values ('logos', 'logos', true);

create policy "Authenticated users can upload logos"
  on storage.objects for insert
  with check (bucket_id = 'logos' and auth.role() = 'authenticated');

create policy "Anyone can view logos"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "Users can update own logos"
  on storage.objects for update
  using (bucket_id = 'logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own logos"
  on storage.objects for delete
  using (bucket_id = 'logos' and auth.uid()::text = (storage.foldername(name))[1]);
