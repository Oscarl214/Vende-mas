import { supabase } from './supabase';

type ProfileContext = {
  business_name: string | null;
  business_type: string | null;
  location: string | null;
  services_offered: string | null;
  target_customer: string | null;
  tone: string | null;
  default_language: string | null;
};

type LeadContext = {
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
};

export async function generateContent(params: {
  contentGoal: string;
  platform: string;
  promotionDetails?: string;
  maxLength?: string;
  profile: ProfileContext;
}): Promise<{ caption: string }> {
  const { data, error } = await supabase.functions.invoke('generate-content', {
    body: params,
  });
  if (error) throw error;
  return data;
}

export async function generateFollowUp(params: {
  lead: LeadContext;
  profile: ProfileContext;
}): Promise<{ message: string }> {
  const { data, error } = await supabase.functions.invoke('generate-followup', {
    body: params,
  });
  if (error) throw error;
  return data;
}
