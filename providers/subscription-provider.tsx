import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { useSession } from '@/hooks/use-session';
import { TIERS, type Tier } from '@/constants/tiers';
import {
  configureRevenueCat,
  getSubscriptionStatus,
  purchaseProPlan as rcPurchase,
  restorePurchases as rcRestore,
  syncSubscriptionToSupabase,
} from '@/lib/revenuecat';
import { getMonthlyUsage, type MonthlyUsage } from '@/lib/usage';
import { supabase } from '@/lib/supabase';

export type SubscriptionContextType = {
  tier: Tier;
  usage: MonthlyUsage;
  loading: boolean;
  canGeneratePost: boolean;
  canStoreLead: boolean;
  purchasePro: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshUsage: () => Promise<void>;
};

const DEFAULT_USAGE: MonthlyUsage = {
  postsGenerated: 0,
  leadsStored: 0,
  period: '',
};

export const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: 'free',
  usage: DEFAULT_USAGE,
  loading: true,
  canGeneratePost: true,
  canStoreLead: true,
  purchasePro: async () => {},
  restorePurchases: async () => {},
  refreshUsage: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [tier, setTier] = useState<Tier>('free');
  const [usage, setUsage] = useState<MonthlyUsage>(DEFAULT_USAGE);
  const [loading, setLoading] = useState(true);

  const tierLimits = TIERS[tier];

  const canGeneratePost =
    tier === 'pro' || usage.postsGenerated < tierLimits.postsPerMonth;
  const canStoreLead =
    tier === 'pro' || usage.leadsStored < tierLimits.maxLeads;

  const refreshUsage = useCallback(async () => {
    if (!user) return;
    try {
      const u = await getMonthlyUsage(user.id);
      setUsage(u);
    } catch {
      // Keep existing usage on error
    }
  }, [user]);

  const fetchTierFromSupabase = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .single();
    if (data?.tier) setTier(data.tier as Tier);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        if (Platform.OS !== 'web') {
          await configureRevenueCat(user.id);
          const { tier: rcTier, customerInfo } =
            await getSubscriptionStatus();
          if (rcTier === 'pro') {
            setTier(rcTier);
            await syncSubscriptionToSupabase(customerInfo, rcTier);
          } else {
            await fetchTierFromSupabase();
          }
        } else {
          await fetchTierFromSupabase();
        }

        await refreshUsage();
      } catch {
        await fetchTierFromSupabase();
        await refreshUsage();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user, fetchTierFromSupabase, refreshUsage]);

  const purchasePro = useCallback(async () => {
    const newTier = await rcPurchase();
    setTier(newTier);
    await refreshUsage();
  }, [refreshUsage]);

  const restorePurchases = useCallback(async () => {
    const newTier = await rcRestore();
    setTier(newTier);
    await refreshUsage();
  }, [refreshUsage]);

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        usage,
        loading,
        canGeneratePost,
        canStoreLead,
        purchasePro,
        restorePurchases,
        refreshUsage,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}
