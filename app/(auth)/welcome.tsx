import { View, YStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <YStack
      flex={1}
      backgroundColor="$brandBackground"
      paddingTop={insets.top}
      paddingBottom={insets.bottom}
    >
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
        <View
          width={100}
          height={100}
          borderRadius={24}
          backgroundColor="$brandPrimary"
          justifyContent="center"
          alignItems="center"
          marginBottom="$6"
        >
          <Text fontSize={48} color="$brandTextInverse" fontWeight="bold">
            V
          </Text>
        </View>

        <Text
          fontSize={32}
          fontWeight="bold"
          color="$brandSecondary"
          textAlign="center"
          marginBottom="$2"
        >
          VendeMás
        </Text>

        <Text
          fontSize={18}
          color="$brandTextLight"
          textAlign="center"
          marginBottom="$2"
          lineHeight={26}
        >
          {t('auth.welcome.tagline')}
        </Text>

        <Text
          fontSize={14}
          color="$brandTextLight"
          textAlign="center"
          opacity={0.7}
        >
          {t('auth.welcome.taglineSub')}
        </Text>
      </YStack>

      <YStack padding="$6" gap="$3">
        <Button
          variant="primary"
          onPress={() => router.push('/(auth)/sign-up')}
        >
          {t('auth.welcome.createAccount')}
        </Button>

        <Button
          variant="outline"
          onPress={() => router.push('/(auth)/sign-in')}
        >
          {t('auth.welcome.signIn')}
        </Button>
      </YStack>
    </YStack>
  );
}
