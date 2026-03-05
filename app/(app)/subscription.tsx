import { Alert } from 'react-native';
import { YStack, Text, XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/use-subscription';
import { Ionicons } from '@expo/vector-icons';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    tier,
    nextBillingDate,
    openManageSubscriptions,
  } = useSubscription();

  if (tier !== 'pro') {
    router.replace('/(app)/paywall');
    return null;
  }

  const proPrice = t('tiers.proPrice');
  const planLabel = t('tiers.pro');

  const handleCancelPress = () => {
    const message = nextBillingDate
      ? t('settings.subscriptionScreen.cancelConfirmMessageWithDate', {
          date: nextBillingDate,
        })
      : t('settings.subscriptionScreen.cancelConfirmMessage');
    Alert.alert(
      t('settings.subscriptionScreen.cancelConfirmTitle'),
      message,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.subscriptionScreen.cancelConfirmButton'),
          style: 'destructive',
          onPress: openManageSubscriptions,
        },
      ],
    );
  };

  return (
    <YStack flex={1} padding="$5" gap="$4">
      <YStack gap="$2">
        <Text fontSize={22} fontWeight="bold" color="$brandSecondary">
          {t('settings.subscriptionScreen.title')}
        </Text>
        <Text fontSize={15} color="$brandTextLight">
          {t('settings.subscriptionScreen.subtitle')}
        </Text>
      </YStack>

      <Card variant="outlined" padding="$4" gap="$3">
        <XStack alignItems="center" gap="$3">
          <XStack
            width={48}
            height={48}
            borderRadius={24}
            backgroundColor="$brandAccent"
            justifyContent="center"
            alignItems="center"
          >
            <Ionicons name="rocket" size={24} color="#fff" />
          </XStack>
          <YStack flex={1}>
            <Text fontSize={14} color="$brandTextLight">
              {t('settings.subscriptionScreen.planLabel')}
            </Text>
            <Text fontSize={20} fontWeight="bold" color="$brandSecondary">
              {planLabel}
            </Text>
          </YStack>
        </XStack>

        <YStack gap="$1">
          <Text fontSize={14} color="$brandTextLight">
            {t('settings.subscriptionScreen.priceLabel')}
          </Text>
          <Text fontSize={18} fontWeight="600" color="$brandText">
            {proPrice}
          </Text>
        </YStack>

        {nextBillingDate && (
          <YStack gap="$1">
            <Text fontSize={14} color="$brandTextLight">
              {t('settings.subscriptionScreen.nextBillingLabel')}
            </Text>
            <Text fontSize={18} fontWeight="600" color="$brandText">
              {nextBillingDate}
            </Text>
          </YStack>
        )}
      </Card>

      <Button
        variant="outline"
        onPress={handleCancelPress}
        borderColor="$red10"
        backgroundColor="transparent"
      >
        <Text color="$red10">{t('settings.subscriptionScreen.cancelButton')}</Text>
      </Button>
    </YStack>
  );
}
