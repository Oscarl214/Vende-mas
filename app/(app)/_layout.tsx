import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AppLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen
        name="profile-setup"
        options={{
          headerShown: true,
          title: t('profile.setupTitle'),
        }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: t('paywall.title'),
        }}
      />
      <Stack.Screen
        name="subscription"
        options={{
          headerShown: true,
          title: t('settings.subscriptionScreen.title'),
        }}
      />
      <Stack.Screen
        name="generate-post"
        options={{
          headerShown: true,
          title: t('contentEngine.title'),
        }}
      />
      <Stack.Screen
        name="lead-detail"
        options={{
          headerShown: true,
          title: t('leadDetail.title'),
        }}
      />
      <Stack.Screen
        name="post-detail"
        options={{
          headerShown: true,
          title: t('postDetail.title'),
        }}
      />
    </Stack>
  );
}
