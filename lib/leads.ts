import { supabase } from './supabase';

export type LeadStatus = 'new' | 'contacted' | 'closed';

export type Lead = {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source_post_id: string | null;
  created_at: string;
  status: LeadStatus;
};

export type CreateLeadData = {
  name?: string;
  phone?: string;
  email?: string;
  source_post_id?: string;
};

export async function createLead(userId: string, lead: CreateLeadData) {
  const { data, error } = await supabase
    .from('leads')
    .insert({ user_id: userId, ...lead })
    .select()
    .single();
  if (error) throw error;

  await supabase.rpc('increment_lead_count', { p_user_id: userId });

  return data as Lead;
}

export async function getLeads(userId: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Lead[];
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const { data, error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId)
    .select()
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function getLeadsByPost(postId: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('source_post_id', postId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Lead[];
}
