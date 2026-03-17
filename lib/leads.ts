import { supabase } from './supabase';
import { decrementLeadCount } from './usage';

export type LeadStatus = 'new' | 'contacted' | 'booked' | 'closed';

export type Lead = {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source_post_id: string | null;
  created_at: string;
  status: LeadStatus;
  last_contacted_at?: string | null;
  event_date?: string | null;
  revenue?: number | null;
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

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/** Set to true to show follow-up reminder UI on all New/Contacted leads for testing. */
const FOLLOW_UP_REMINDER_DEBUG = false;

/** True if lead matches follow-up reminder rules (New + 2d no contact, or Contacted + 3d since contact). */
export function leadNeedsFollowUp(lead: Lead): boolean {
  if (FOLLOW_UP_REMINDER_DEBUG) {
    return lead.status === 'new' || lead.status === 'contacted';
  }
  const now = Date.now();
  if (lead.status === 'new') {
    const created = new Date(lead.created_at).getTime();
    return now - created > TWO_DAYS_MS && lead.last_contacted_at == null;
  }
  if (lead.status === 'contacted' && lead.last_contacted_at) {
    const last = new Date(lead.last_contacted_at).getTime();
    return now - last > THREE_DAYS_MS;
  }
  return false;
}

/** Days since a given date string (for reminder copy). */
export function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000));
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const payload: { status: LeadStatus; last_contacted_at?: string } = { status };
  if (status === 'contacted') {
    payload.last_contacted_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from('leads')
    .update(payload)
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

export async function updateLeadRevenue(leadId: string, revenue: number | null) {
  const { data, error } = await supabase
    .from('leads')
    .update({ revenue })
    .eq('id', leadId)
    .select()
    .single();
  if (error) throw error;
  return data as Lead;
}

export type LeadMessage = {
  id: string;
  lead_id: string;
  user_id: string;
  message: string;
  channel: 'sms' | 'whatsapp' | 'email';
  sent_at: string;
};

export async function logLeadMessage(
  leadId: string,
  userId: string,
  message: string,
  channel: LeadMessage['channel'],
): Promise<LeadMessage> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('lead_messages')
    .insert({ lead_id: leadId, user_id: userId, message, channel, sent_at: now })
    .select()
    .single();
  if (error) throw error;
  // Keep last_contacted_at current whenever a message is logged
  await supabase.from('leads').update({ last_contacted_at: now }).eq('id', leadId);
  return data as LeadMessage;
}

export async function getLeadMessages(leadId: string): Promise<LeadMessage[]> {
  const { data, error } = await supabase
    .from('lead_messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false });
  if (error) throw error;
  return data as LeadMessage[];
}

export async function deleteLead(leadId: string) {
  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('user_id')
    .eq('id', leadId)
    .single();
  if (fetchError || !lead) throw fetchError || new Error('Lead not found');

  const { error: deleteError } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId);
  if (deleteError) throw deleteError;

  await decrementLeadCount(lead.user_id);
}
