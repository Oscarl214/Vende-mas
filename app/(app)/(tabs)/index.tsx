import { useCallback, useState } from 'react';
import { YStack, Text, XStack } from 'tamagui';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { useSubscription } from '@/hooks/use-subscription';
import { TIERS } from '@/constants/tiers';
import { ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getGrowthChecklist, isChecklistComplete, type GrowthChecklist } from '@/lib/onboarding';
import { useBrandTheme } from '@/hooks/use-brand-theme';
import { getDashboardStats, type DashboardStats } from '@/lib/dashboard';

function UsageBar({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number;
}) {
  const ratio = max === Infinity ? 0 : Math.min(current / max, 1);
  const display = max === Infinity ? `${current}` : `${current}/${max}`;

  return (
    <YStack gap="$1.5">
      <XStack justifyContent="space-between">
        <Text fontSize={13} color="$brandTextLight">
          {label}
        </Text>
        <Text fontSize={13} fontWeight="600" color={ratio >= 1 ? '$brandError' : '$brandText'}>
          {display}
        </Text>
      </XStack>
      {max !== Infinity && (
        <XStack height={6} borderRadius={3} backgroundColor="$brandBorder" overflow="hidden">
          <XStack
            height={6}
            borderRadius={3}
            backgroundColor={ratio >= 1 ? '$brandError' : '$brandPrimary'}
            width={`${ratio * 100}%` as any}
          />
        </XStack>
      )}
    </YStack>
  );
}

const MILESTONES: { key: keyof GrowthChecklist; labelKey: string }[] = [
  { key: 'first_post_created', labelKey: 'onboarding.milestonePostCreated' },
  { key: 'first_post_shared', labelKey: 'onboarding.milestonePostShared' },
  { key: 'first_lead', labelKey: 'onboarding.milestoneFirstLead' },
  { key: 'first_booking_closed', labelKey: 'onboarding.milestoneFirstBooking' },
];

export default function DashboardScreen() {
  const { profile } = useSession();
  const { tier, usage, refreshUsage } = useSubscription();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const brand = useBrandTheme();
  const limits = TIERS[tier];
  const proPrice = t('tiers.proPrice');
  const [checklist, setChecklist] = useState<GrowthChecklist | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const showChecklist = checklist !== null && !isChecklistComplete(checklist);

  useFocusEffect(
    useCallback(() => {
      refreshUsage();
      getGrowthChecklist().then(setChecklist);
      if (profile?.id) {
        getDashboardStats(profile.id).then(setStats).catch(() => {});
      }
    }, [refreshUsage, profile?.id]),
  );

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}
    >
      <YStack padding="$5" gap="$4">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack gap="$0.5" flex={1}>
            <Text fontSize={13} color="$brandTextLight" letterSpacing={0.2}>
              {t('dashboard.welcomeBack')}
            </Text>
            <Text fontSize={26} fontWeight="800" color="$brandSecondary" letterSpacing={-0.5}>
              {profile?.business_name ?? t('dashboard.yourBusiness')}
            </Text>
          </YStack>
          <XStack
            paddingHorizontal={10}
            paddingVertical={5}
            borderRadius={20}
            backgroundColor={tier === 'pro' ? brand.accent : '$brandBackground'}
            marginTop="$1"
          >
            <Text
              fontSize={11}
              fontWeight="700"
              letterSpacing={0.5}
              color={tier === 'pro' ? brand.onPrimary : '$brandTextLight'}
            >
              {tier === 'pro' ? t('dashboard.pro').toUpperCase() : t('dashboard.free').toUpperCase()}
            </Text>
          </XStack>
        </XStack>

        {usage.postsGenerated === 0 && (
          <Pressable onPress={() => router.push('/(app)/generate-post')}>
            <YStack
              borderRadius={16}
              backgroundColor={brand.primary}
              padding="$4"
              gap="$2"
              style={{
                shadowColor: brand.primary,
                shadowOpacity: 0.3,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
              }}
            >
              <XStack alignItems="center" gap="$2">
                <Ionicons name="sparkles" size={18} color={brand.onPrimary} />
                <Text fontSize={15} fontWeight="800" color={brand.onPrimary} letterSpacing={-0.3}>
                  {t('dashboard.firstPostHeroTitle')}
                </Text>
              </XStack>
              <Text fontSize={13} color={brand.onPrimary} opacity={0.85} lineHeight={19}>
                {t('dashboard.firstPostHeroSub')}
              </Text>
              <XStack
                alignSelf="flex-start"
                marginTop="$1"
                backgroundColor="rgba(255,255,255,0.2)"
                paddingHorizontal="$3"
                paddingVertical="$1.5"
                borderRadius={20}
                alignItems="center"
                gap="$1.5"
              >
                <Text fontSize={13} fontWeight="700" color={brand.onPrimary}>
                  {t('dashboard.firstPostHeroCta')}
                </Text>
                <Ionicons name="arrow-forward" size={13} color={brand.onPrimary} />
              </XStack>
            </YStack>
          </Pressable>
        )}

        {showChecklist && (
          <Card variant="outlined" gap="$3">
            <Text fontSize={11} fontWeight="700" color="$brandTextLight" letterSpacing={1.0} textTransform="uppercase">
              {t('onboarding.growthSetup')}
            </Text>
            {MILESTONES.map(({ key, labelKey }) => {
              const done = checklist[key];
              return (
                <XStack key={key} alignItems="center" gap="$2.5">
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={done ? '#16A34A' : '#D1D5DB'}
                  />
                  <Text
                    fontSize={14}
                    color={done ? '$brandText' : '$brandTextLight'}
                    fontWeight={done ? '500' : '400'}
                  >
                    {t(labelKey)}
                  </Text>
                </XStack>
              );
            })}
          </Card>
        )}

        {tier === 'free' && (
          <Pressable onPress={() => router.push('/(app)/paywall')}>
            <XStack
              borderRadius={16}
              backgroundColor="$brandBackground"
              borderWidth={1.5}
              borderColor={brand.accent}
              padding="$3.5"
              alignItems="center"
              gap="$3"
            >
              <XStack
                width={44}
                height={44}
                borderRadius={14}
                backgroundColor={brand.accent}
                justifyContent="center"
                alignItems="center"
              >
                <Ionicons name="rocket" size={20} color={brand.onPrimary} />
              </XStack>
              <YStack flex={1}>
                <Text fontSize={14} fontWeight="700" color="$brandSecondary">
                  {t('dashboard.upgradeTitle', { price: proPrice })}
                </Text>
                <Text fontSize={12} color="$brandTextLight">
                  {t('dashboard.upgradeSubtitle')}
                </Text>
              </YStack>
              <Ionicons name="chevron-forward" size={18} color={brand.accent} />
            </XStack>
          </Pressable>
        )}

        <Card variant="outlined" gap="$3">
          <Text fontSize={11} fontWeight="700" color="$brandTextLight" letterSpacing={1.0} textTransform="uppercase">
            {t('dashboard.usageTitle')}
          </Text>
          <UsageBar
            label={t('dashboard.postsGenerated')}
            current={usage.postsGenerated}
            max={limits.postsPerMonth}
          />
          <UsageBar
            label={t('dashboard.leadsStored')}
            current={usage.leadsStored}
            max={limits.maxLeads}
          />
        </Card>

        <Text
          fontSize={11}
          fontWeight="700"
          color="$brandTextLight"
          letterSpacing={1.0}
          textTransform="uppercase"
          marginTop="$2"
        >
          {t('dashboard.quickActions')}
        </Text>
        <XStack gap="$3">
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(app)/generate-post')}>
            <Card variant="elevated" flex={1} alignItems="center" gap="$2.5" padding="$4">
              <XStack
                width={52}
                height={52}
                borderRadius={16}
                backgroundColor={brand.primary}
                justifyContent="center"
                alignItems="center"
              >
                <Ionicons name="sparkles" size={24} color={brand.onPrimary} />
              </XStack>
              <Text fontSize={12} fontWeight="600" textAlign="center" color="$brandText" letterSpacing={0.1}>
                {t('dashboard.generatePost')}
              </Text>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(app)/(tabs)/leads')}>
            <Card variant="elevated" flex={1} alignItems="center" gap="$2.5" padding="$4">
              <XStack
                width={52}
                height={52}
                borderRadius={16}
                backgroundColor={brand.accent}
                justifyContent="center"
                alignItems="center"
              >
                <Ionicons name="people" size={24} color={brand.onPrimary} />
              </XStack>
              <Text fontSize={12} fontWeight="600" textAlign="center" color="$brandText" letterSpacing={0.1}>
                {t('dashboard.viewLeads')}
              </Text>
            </Card>
          </Pressable>
        </XStack>

        <Text
          fontSize={11}
          fontWeight="700"
          color="$brandTextLight"
          letterSpacing={1.0}
          textTransform="uppercase"
          marginTop="$2"
        >
          {t('dashboard.summary')}
        </Text>
        <Card variant="outlined" padding="$4">
          <XStack justifyContent="space-around" alignItems="center">
            <YStack alignItems="center" gap="$1">
              <Text fontSize={34} fontWeight="800" color="$brandPrimary" letterSpacing={-1}>
                {stats?.leadsGenerated ?? 0}
              </Text>
              <XStack alignItems="center" gap="$1">
                <Ionicons name="people" size={14} color="#0F766E" />
                <Text fontSize={12} color="$brandTextLight">
                  {t('dashboard.leadsThisMonth')}
                </Text>
              </XStack>
            </YStack>
            <YStack width={1} height={48} backgroundColor="$brandBorder" />
            <YStack alignItems="center" gap="$1">
              <Text fontSize={34} fontWeight="800" color="#16A34A" letterSpacing={-1}>
                {stats?.bookings ?? 0}
              </Text>
              <XStack alignItems="center" gap="$1">
                <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                <Text fontSize={12} color="$brandTextLight">
                  {t('dashboard.bookingsThisMonth')}
                </Text>
              </XStack>
            </YStack>
            <YStack width={1} height={48} backgroundColor="$brandBorder" />
            <YStack alignItems="center" gap="$1">
              <Text fontSize={34} fontWeight="800" color="$brandSecondary" letterSpacing={-1}>
                {usage.postsGenerated}
              </Text>
              <XStack alignItems="center" gap="$1">
                <Ionicons name="sparkles" size={14} color="#6B7280" />
                <Text fontSize={12} color="$brandTextLight">
                  {t('dashboard.postsThisMonth')}
                </Text>
              </XStack>
            </YStack>
          </XStack>
        </Card>
      </YStack>
    </ScrollView>
  );
}
