import { View, YStack, Text, XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBrandTheme } from '@/hooks/use-brand-theme';

const FEATURES = [
  { icon: 'sparkles' as const, labelKey: 'auth.welcome.featureAI' },
  { icon: 'people' as const, labelKey: 'auth.welcome.featureLeads' },
  { icon: 'trending-up' as const, labelKey: 'auth.welcome.featureGrowth' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const brand = useBrandTheme();

  return (
    <YStack
      flex={1}
        backgroundColor="$brandBackground"
      paddingTop={insets.top}
      paddingBottom={insets.bottom + 8}
    >
      {/* Hero */}
      <YStack flex={1} justifyContent="center" alignItems="center" paddingHorizontal="$6" gap="$6">
        {/* Logo mark */}
        <YStack alignItems="center" gap="$3">
          <View
            width={88}
            height={88}
            borderRadius={26}
            backgroundColor={brand.primary}
            justifyContent="center"
            alignItems="center"
            style={{
              shadowColor: brand.primary,
              shadowOpacity: 0.35,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 10 },
            }}
          >
            <Text fontSize={40} color={brand.onPrimary} fontWeight="800" letterSpacing={-2}>
              V
            </Text>
          </View>
          <Text
            fontSize={11}
            fontWeight="700"
            color={brand.primary}
            letterSpacing={4}
            textTransform="uppercase"
          >
            VendeMás
          </Text>
        </YStack>

        {/* Headline */}
        <YStack alignItems="center" gap="$2">
          <Text
            fontSize={36}
            fontWeight="800"
            color="$brandSecondary"
            textAlign="center"
            lineHeight={42}
            letterSpacing={-1}
          >
            {t('auth.welcome.tagline')}
          </Text>
          <Text
            fontSize={16}
            color="$brandTextLight"
            textAlign="center"
            lineHeight={24}
          >
            {t('auth.welcome.taglineSub')}
          </Text>
        </YStack>

        {/* Feature pills */}
        <XStack gap="$2" justifyContent="center" flexWrap="wrap">
          {FEATURES.map(({ icon, labelKey }) => (
            <XStack
              key={labelKey}
              alignItems="center"
              gap="$1.5"
              backgroundColor={brand.primary}
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius={20}
            >
              <Ionicons name={icon} size={13} color="#FFFFFF" />
              <Text fontSize={12} fontWeight="600" color="#FFFFFF">
                {t(labelKey)}
              </Text>
            </XStack>
          ))}
        </XStack>
      </YStack>

      {/* CTAs */}
      <YStack paddingHorizontal="$6" paddingTop="$2" gap="$3">
        <Button
          variant="primary"
          height={54}
          backgroundColor={brand.primary}
          color={brand.onPrimary}
          hoverStyle={{ backgroundColor: brand.primaryDark }}
          onPress={() => router.push('/(auth)/sign-up')}
        >
          {t('auth.welcome.createAccount')}
        </Button>

        <Button
          variant="outline"
          height={50}
          borderColor={brand.primary}
          color={brand.primary}
          onPress={() => router.push('/(auth)/sign-in')}
        >
          {t('auth.welcome.signIn')}
        </Button>
      </YStack>
    </YStack>
  );
}
