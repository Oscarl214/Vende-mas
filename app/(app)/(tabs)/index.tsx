import { useCallback } from 'react';
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

export default function DashboardScreen() {
  const { profile } = useSession();
  const { tier, usage, refreshUsage } = useSubscription();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const limits = TIERS[tier];
  const proPrice = t('tiers.proPrice');

  useFocusEffect(
    useCallback(() => {
      refreshUsage();
    }, [refreshUsage]),
  );

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}
    >
      <YStack padding="$5" gap="$4">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack gap="$1" flex={1}>
            <Text fontSize={14} color="$brandTextLight">
              {t('dashboard.welcomeBack')}
            </Text>
            <Text fontSize={24} fontWeight="bold" color="$brandSecondary">
              {profile?.business_name ?? t('dashboard.yourBusiness')}
            </Text>
          </YStack>
          <XStack
            paddingHorizontal="$2.5"
            paddingVertical="$1.5"
            borderRadius={8}
            backgroundColor={tier === 'pro' ? '$brandAccent' : '$brandBorder'}
          >
            <Text
              fontSize={12}
              fontWeight="bold"
              color={tier === 'pro' ? '$brandTextInverse' : '$brandTextLight'}
            >
              {tier === 'pro' ? t('dashboard.pro') : t('dashboard.free')}
            </Text>
          </XStack>
        </XStack>

        {tier === 'free' && (
          <Pressable onPress={() => router.push('/(app)/paywall')}>
            <Card variant="flat" padding="$3.5">
              <XStack alignItems="center" gap="$3">
                <XStack
                  width={40}
                  height={40}
                  borderRadius={20}
                  backgroundColor="$brandAccent"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Ionicons name="rocket" size={20} color="#fff" />
                </XStack>
                <YStack flex={1}>
                  <Text fontSize={14} fontWeight="600" color="$brandSecondary">
                    {t('dashboard.upgradeTitle', { price: proPrice })}
                  </Text>
                  <Text fontSize={12} color="$brandTextLight">
                    {t('dashboard.upgradeSubtitle')}
                  </Text>
                </YStack>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </XStack>
            </Card>
          </Pressable>
        )}

        <Card variant="outlined" gap="$3">
          <Text fontSize={15} fontWeight="600" color="$brandSecondary">
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

        <Text fontSize={18} fontWeight="600" color="$brandSecondary" marginTop="$2">
          {t('dashboard.quickActions')}
        </Text>
        <XStack gap="$3">
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(app)/generate-post')}>
            <Card variant="elevated" flex={1} alignItems="center" gap="$2" padding="$4">
              <XStack
                width={48}
                height={48}
                borderRadius={24}
                backgroundColor="$brandPrimary"
                justifyContent="center"
                alignItems="center"
              >
                <Ionicons name="sparkles" size={24} color="#fff" />
              </XStack>
              <Text fontSize={13} fontWeight="500" textAlign="center" color="$brandText">
                {t('dashboard.generatePost')}
              </Text>
            </Card>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(app)/(tabs)/leads')}>
            <Card variant="elevated" flex={1} alignItems="center" gap="$2" padding="$4">
              <XStack
                width={48}
                height={48}
                borderRadius={24}
                backgroundColor="$brandAccent"
                justifyContent="center"
                alignItems="center"
              >
                <Ionicons name="people" size={24} color="#fff" />
              </XStack>
              <Text fontSize={13} fontWeight="500" textAlign="center" color="$brandText">
                {t('dashboard.viewLeads')}
              </Text>
            </Card>
          </Pressable>
        </XStack>

        <Text fontSize={18} fontWeight="600" color="$brandSecondary" marginTop="$2">
          {t('dashboard.summary')}
        </Text>
        <Card variant="outlined" gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Text fontSize={14} color="$brandTextLight">
                {t('dashboard.newLeads')}
              </Text>
              <Text fontSize={28} fontWeight="bold" color="$brandPrimary">
                {usage.leadsStored}
              </Text>
            </YStack>
            <Ionicons name="trending-up" size={32} color="#0F766E" />
          </XStack>
        </Card>

        <Card variant="outlined" gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Text fontSize={14} color="$brandTextLight">
                {t('dashboard.postsThisMonth')}
              </Text>
              <Text fontSize={28} fontWeight="bold" color="$brandSecondary">
                {usage.postsGenerated}
              </Text>
            </YStack>
            <Ionicons name="calendar-outline" size={32} color="#6B7280" />
          </XStack>
        </Card>
      </YStack>
    </ScrollView>
  );
}
