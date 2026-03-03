import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { supabase } from './supabase';
import { PRO_ENTITLEMENT_ID, type Tier } from '@/constants/tiers';

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  default: '',
});

let configured = false;

export async function configureRevenueCat(userId: string) {
  if (configured) return;

  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: API_KEY, appUserID: userId });
  configured = true;
}

export function getTierFromCustomerInfo(info: CustomerInfo): Tier {
  const hasProEntitlement =
    info.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
  return hasProEntitlement ? 'pro' : 'free';
}

export async function getSubscriptionStatus(): Promise<{
  tier: Tier;
  customerInfo: CustomerInfo;
}> {
  const info = await Purchases.getCustomerInfo();
  return { tier: getTierFromCustomerInfo(info), customerInfo: info };
}

export async function getOfferings(): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages[0] ?? null;
}

export async function purchaseProPlan(): Promise<Tier> {
  const pkg = await getOfferings();
  if (!pkg) throw new Error('No hay paquetes disponibles');

  const { customerInfo } = await Purchases.purchasePackage(pkg);
  const tier = getTierFromCustomerInfo(customerInfo);
  await syncSubscriptionToSupabase(customerInfo, tier);
  return tier;
}

export async function restorePurchases(): Promise<Tier> {
  const info = await Purchases.restorePurchases();
  const tier = getTierFromCustomerInfo(info);
  await syncSubscriptionToSupabase(info, tier);
  return tier;
}

export async function syncSubscriptionToSupabase(
  customerInfo: CustomerInfo,
  tier: Tier,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const proEntitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];

  await supabase
    .from('subscriptions')
    .update({
      tier,
      revenuecat_customer_id: customerInfo.originalAppUserId,
      product_id: proEntitlement?.productIdentifier ?? null,
      expires_at: proEntitlement?.expirationDate ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);
}
