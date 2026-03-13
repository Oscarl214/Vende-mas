import { supabase } from './supabase';
import { getMonthlyUsage } from './usage';

export type DashboardStats = {
  postsCreated: number;
  leadsGenerated: number;
  bookings: number;
  revenue: number;
};

function startOfCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01T00:00:00.000Z`;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const monthStart = startOfCurrentMonth();

  const [usage, leadsResult] = await Promise.all([
    getMonthlyUsage(userId),
    supabase
      .from('leads')
      .select('id, status, revenue, created_at')
      .eq('user_id', userId),
  ]);

  if (leadsResult.error) throw leadsResult.error;

  const leads = (leadsResult.data ?? []) as {
    id: string;
    status: string;
    revenue: number | null;
    created_at: string;
  }[];
  const thisMonthLeads = leads.filter((l) => l.created_at >= monthStart);
  const leadsGenerated = thisMonthLeads.length;
  const bookings = thisMonthLeads.filter((l) => l.status === 'booked').length;
  const revenue = leads.reduce((sum, l) => sum + (l.revenue ?? 0), 0);

  return {
    postsCreated: usage.postsGenerated,
    leadsGenerated,
    bookings,
    revenue,
  };
}
