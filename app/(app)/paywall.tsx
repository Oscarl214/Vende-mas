import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { YStack, Text, XStack } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/use-subscription';

type Feature = {
  labelKey: string;
  free: string | boolean;
  pro: string | boolean;
};

function FeatureCheck({ value }: { value: string | boolean }) {
  if (typeof value === 'string') {
    return (
      <Text fontSize={14} fontWeight="600" color="$brandText">
        {value}
      </Text>
    );
  }
  return value ? (
    <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
  ) : (
    <Ionicons name="close-circle" size={20} color="#D1D5DB" />
  );
}

export default function PaywallScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { tier, purchasePro, restorePurchases } = useSubscription();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const features: Feature[] = [
    { labelKey: 'paywall.features.aiPosts', free: '3', pro: t('paywall.features.unlimited') },
    { labelKey: 'paywall.features.leads', free: '5', pro: t('paywall.features.unlimited') },
    { labelKey: 'paywall.features.aiFollowUp', free: false, pro: true },
    { labelKey: 'paywall.features.followUpReminders', free: false, pro: true },
    { labelKey: 'paywall.features.smsAutomation', free: false, pro: true },
    { labelKey: 'paywall.features.advancedAutomation', free: false, pro: true },
  ];

  const limitKey = `paywall.limitMessages.${reason ?? 'default'}`;
  const limitMessage = t(limitKey, { defaultValue: t('paywall.limitMessages.default') });

  const proPrice = t('tiers.proPrice');

  const handlePurchase = async () => {
    setLoading(true);
    try {
      await purchasePro();
      Alert.alert(t('paywall.welcomePro.title'), t('paywall.welcomePro.message'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert(t('common.error'), e.message ?? t('paywall.purchaseError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      Alert.alert(
        t('paywall.restored.title'),
        tier === 'pro'
          ? t('paywall.restored.success')
          : t('paywall.restored.notFound'),
        [{ text: t('common.ok'), onPress: () => tier === 'pro' && router.back() }],
      );
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message ?? t('paywall.restored.error'));
    } finally {
      setRestoring(false);
    }
  };

  if (tier === 'pro') {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$4">
        <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
        <Text fontSize={22} fontWeight="bold" color="$brandSecondary" textAlign="center">
          {t('paywall.alreadyPro')}
        </Text>
        <Text fontSize={15} color="$brandTextLight" textAlign="center">
          {t('paywall.alreadyProDesc')}
        </Text>
        <Button variant="primary" onPress={() => router.back()} marginTop="$4">
          {t('paywall.goBack')}
        </Button>
      </YStack>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}
    >
      <YStack padding="$5" gap="$5">
        <YStack alignItems="center" gap="$2" paddingTop="$4">
          <XStack
            width={64}
            height={64}
            borderRadius={32}
            backgroundColor="$brandAccent"
            justifyContent="center"
            alignItems="center"
          >
            <Ionicons name="rocket" size={32} color="#fff" />
          </XStack>
          <Text fontSize={26} fontWeight="bold" color="$brandSecondary" textAlign="center">
            {t('paywall.title')}
          </Text>
          <Text fontSize={15} color="$brandTextLight" textAlign="center" lineHeight={22}>
            {limitMessage}
          </Text>
        </YStack>

        <Card variant="outlined" padding="$0" overflow="hidden">
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$3"
            backgroundColor="$brandBackground"
            borderBottomWidth={1}
            borderBottomColor="$brandBorder"
          >
            <Text flex={2} fontSize={14} fontWeight="600" color="$brandTextLight">
              {t('paywall.tableHeader.feature')}
            </Text>
            <Text flex={1} fontSize={14} fontWeight="600" color="$brandTextLight" textAlign="center">
              {t('paywall.tableHeader.free')}
            </Text>
            <Text flex={1} fontSize={14} fontWeight="600" color="$brandAccent" textAlign="center">
              {t('paywall.tableHeader.pro')}
            </Text>
          </XStack>

          {features.map((feature, i) => (
            <XStack
              key={feature.labelKey}
              paddingHorizontal="$4"
              paddingVertical="$3.5"
              borderBottomWidth={i < features.length - 1 ? 1 : 0}
              borderBottomColor="$brandBorder"
              alignItems="center"
            >
              <Text flex={2} fontSize={14} color="$brandText">
                {t(feature.labelKey)}
              </Text>
              <XStack flex={1} justifyContent="center" alignItems="center">
                <FeatureCheck value={feature.free} />
              </XStack>
              <XStack flex={1} justifyContent="center" alignItems="center">
                <FeatureCheck value={feature.pro} />
              </XStack>
            </XStack>
          ))}
        </Card>

        <YStack alignItems="center" gap="$1">
          <XStack alignItems="baseline" gap="$1">
            <Text fontSize={36} fontWeight="bold" color="$brandSecondary">
              {t('paywall.price')}
            </Text>
            <Text fontSize={16} color="$brandTextLight">
              {t('paywall.pricePerMonth')}
            </Text>
          </XStack>
          <Text fontSize={13} color="$brandTextLight">
            {t('paywall.cancelAnytime')}
          </Text>
        </YStack>

        <Button
          variant="primary"
          onPress={handlePurchase}
          disabled={loading}
          opacity={loading ? 0.7 : 1}
          height={56}
        >
          {loading ? t('paywall.subscribing') : t('paywall.subscribe', { price: proPrice })}
        </Button>

        <Button
          variant="ghost"
          onPress={handleRestore}
          disabled={restoring}
          opacity={restoring ? 0.7 : 1}
        >
          {restoring ? t('paywall.restoring') : t('paywall.restorePurchases')}
        </Button>
      </YStack>
    </ScrollView>
  );
}
