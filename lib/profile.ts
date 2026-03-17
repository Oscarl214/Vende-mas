import { supabase } from './supabase';

export type ProfileData = {
  business_name?: string;
  business_type?: string;
  location?: string;
  services_offered?: string;
  target_customer?: string;
  tone?: string;
  default_language?: string;
  logo_url?: string;
  brand_colors?: Record<string, string>;
  contact_phone?: string;
  contact_email?: string;
  website?: string;
  profile_complete?: boolean;
  booking_type?: 'external' | 'internal';
  booking_url?: string | null;
  slug?: string | null;
  specialties?: string;
  pricing_info?: string;
};

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertProfile(userId: string, profile: ProfileData) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      ...profile,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadLogo(userId: string, uri: string) {
  const fileName = `${userId}/logo-${Date.now()}.jpg`;

  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const { data, error } = await supabase.storage
    .from('logos')
    .upload(fileName, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('logos')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}
