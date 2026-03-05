import { Linking, Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { supabase } from './supabase';
import { PRO_ENTITLEMENT_ID, type Tier } from '@/constants/tiers';

/** Format expiration date as "April 5" for display. */
export function formatNextBillingDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export function getNextBillingDateFromCustomerInfo(info: CustomerInfo): string | null {
  const proEntitlement = info.entitlements.active[PRO_ENTITLEMENT_ID];
  const exp = proEntitlement?.expirationDate;
  if (!exp) return null;
  return formatNextBillingDate(exp);
}

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

/** Opens the platform's subscription management (App Store / Play Store). */
export async function showManageSubscriptions(): Promise<void> {
  if (Platform.OS === 'ios') {
    await Linking.openURL('https://apps.apple.com/account/subscriptions');
  } else if (Platform.OS === 'android') {
    await Linking.openURL('https://play.google.com/store/account/subscriptions');
  }
}
