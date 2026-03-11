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

type Benefit = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  labelKey: string;
  descKey: string;
};

const BENEFITS: Benefit[] = [
  {
    icon: 'sparkles',
    iconColor: '#0F766E',
    labelKey: 'paywall.benefits.aiPosts.label',
    descKey: 'paywall.benefits.aiPosts.desc',
  },
  {
    icon: 'people',
    iconColor: '#2563EB',
    labelKey: 'paywall.benefits.leads.label',
    descKey: 'paywall.benefits.leads.desc',
  },
  {
    icon: 'chatbubble-ellipses',
    iconColor: '#7C3AED',
    labelKey: 'paywall.benefits.aiFollowUp.label',
    descKey: 'paywall.benefits.aiFollowUp.desc',
  },
  {
    icon: 'notifications',
    iconColor: '#D97706',
    labelKey: 'paywall.benefits.reminders.label',
    descKey: 'paywall.benefits.reminders.desc',
  },
  {
    icon: 'phone-portrait',
    iconColor: '#059669',
    labelKey: 'paywall.benefits.sms.label',
    descKey: 'paywall.benefits.sms.desc',
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { tier, purchasePro, restorePurchases } = useSubscription();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

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
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$4" backgroundColor="$background">
        <XStack
          width={72}
          height={72}
          borderRadius={22}
          backgroundColor="rgba(22,163,74,0.1)"
          justifyContent="center"
          alignItems="center"
        >
          <Ionicons name="checkmark-circle" size={40} color="#16A34A" />
        </XStack>
        <YStack alignItems="center" gap="$2">
          <Text fontSize={22} fontWeight="800" color="$brandSecondary" textAlign="center" letterSpacing={-0.5}>
            {t('paywall.alreadyPro')}
          </Text>
          <Text fontSize={15} color="$brandTextLight" textAlign="center" lineHeight={22}>
            {t('paywall.alreadyProDesc')}
          </Text>
        </YStack>
        <Button variant="primary" height={52} onPress={() => router.back()} marginTop="$2">
          {t('paywall.goBack')}
        </Button>
      </YStack>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <YStack padding="$5" gap="$5">

        {/* Hero */}
        <YStack alignItems="center" gap="$3" paddingTop="$2" paddingBottom="$1">
          <XStack
            width={72}
            height={72}
            borderRadius={22}
            backgroundColor="#F97316"
            justifyContent="center"
            alignItems="center"
            style={{
              shadowColor: '#F97316',
              shadowOpacity: 0.4,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <Ionicons name="rocket" size={34} color="#fff" />
          </XStack>
          <YStack alignItems="center" gap="$1.5">
            <Text fontSize={28} fontWeight="800" color="$brandSecondary" textAlign="center" letterSpacing={-0.5}>
              {t('paywall.title')}
            </Text>
            <Text fontSize={15} color="$brandTextLight" textAlign="center" lineHeight={22} paddingHorizontal="$4">
              {limitMessage}
            </Text>
          </YStack>
        </YStack>

        {/* Benefits list */}
        <Card variant="outlined" padding="$0" overflow="hidden">
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$2.5"
            backgroundColor="$brandBackground"
            borderBottomWidth={1}
            borderBottomColor="$brandBorder"
          >
            <Text
              fontSize={11}
              fontWeight="700"
              color="$brandTextLight"
              letterSpacing={1.0}
              textTransform="uppercase"
            >
              {t('paywall.whatsIncluded')}
            </Text>
          </XStack>

          {BENEFITS.map(({ icon, iconColor, labelKey, descKey }, i) => (
            <XStack
              key={labelKey}
              paddingHorizontal="$4"
              paddingVertical="$3.5"
              borderTopWidth={i > 0 ? 1 : 0}
              borderTopColor="$brandBorder"
              alignItems="center"
              gap="$3"
            >
              <XStack
                width={40}
                height={40}
                borderRadius={12}
                backgroundColor={iconColor + '18'}
                justifyContent="center"
                alignItems="center"
              >
                <Ionicons name={icon} size={20} color={iconColor} />
              </XStack>
              <YStack flex={1} gap="$0.5">
                <Text fontSize={14} fontWeight="600" color="$brandText">
                  {t(labelKey)}
                </Text>
                <Text fontSize={12} color="$brandTextLight" lineHeight={17}>
                  {t(descKey)}
                </Text>
              </YStack>
              <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
            </XStack>
          ))}
        </Card>

        {/* Pricing */}
        <YStack
          alignItems="center"
          gap="$1"
          backgroundColor="$brandBackground"
          borderRadius={20}
          padding="$4"
          borderWidth={1.5}
          borderColor="#FDBA74"
        >
          <Text
            fontSize={11}
            fontWeight="700"
            color="$brandAccent"
            letterSpacing={1.5}
            textTransform="uppercase"
          >
            PRO
          </Text>
          <XStack alignItems="flex-start" gap="$1" marginTop="$1">
            <Text fontSize={18} fontWeight="700" color="$brandSecondary" marginTop={6}>
              {t('paywall.priceCurrency')}
            </Text>
            <Text fontSize={44} fontWeight="800" color="$brandSecondary" letterSpacing={-2} lineHeight={52}>
              {t('paywall.priceAmount')}
            </Text>
            <Text fontSize={14} color="$brandTextLight" marginTop={14}>
              {t('paywall.pricePerMonth')}
            </Text>
          </XStack>
          <Text fontSize={12} color="$brandTextLight">
            {t('paywall.cancelAnytime')}
          </Text>
        </YStack>

        {/* CTA */}
        <YStack gap="$2">
          <Button
            variant="primary"
            height={56}
            onPress={handlePurchase}
            disabled={loading}
            opacity={loading ? 0.7 : 1}
          >
            {loading ? t('paywall.subscribing') : t('paywall.subscribe', { price: proPrice })}
          </Button>

          <Button
            variant="ghost"
            height={44}
            onPress={handleRestore}
            disabled={restoring}
            opacity={restoring ? 0.7 : 1}
          >
            {restoring ? t('paywall.restoring') : t('paywall.restorePurchases')}
          </Button>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
