import { supabase } from './supabase';

export type MonthlyUsage = {
  postsGenerated: number;
  leadsStored: number;
  period: string;
};

function currentPeriod(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function getMonthlyUsage(userId: string): Promise<MonthlyUsage> {
  const period = currentPeriod();

  const { data, error } = await supabase
    .from('usage')
    .select('posts_generated, leads_stored, period')
    .eq('user_id', userId)
    .eq('period', period)
    .maybeSingle();

  if (error) throw error;

  return {
    postsGenerated: data?.posts_generated ?? 0,
    leadsStored: data?.leads_stored ?? 0,
    period,
  };
}

export async function checkCanGeneratePost(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_can_generate_post', {
    p_user_id: userId,
  });
  if (error) throw error;
  return data as boolean;
}

export async function checkCanStoreLead(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_can_store_lead', {
    p_user_id: userId,
  });
  if (error) throw error;
  return data as boolean;
}

export async function incrementPostCount(userId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_post_count', {
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function incrementLeadCount(userId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_lead_count', {
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function decrementLeadCount(userId: string): Promise<void> {
  const { error } = await supabase.rpc('decrement_lead_count', {
    p_user_id: userId,
  });
  if (error) throw error;
}
