import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

const sharedHeaderStyle = {
  backgroundColor: '#FFFFFF',
  elevation: 0,
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 1 },
  borderBottomColor: '#F3F4F6',
  borderBottomWidth: 1,
} as any;

const sharedHeaderTitleStyle = {
  fontSize: 17,
  fontWeight: '700' as const,
  color: '#1F2937',
  letterSpacing: -0.3,
};

export default function AppLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: sharedHeaderStyle,
        headerTitleStyle: sharedHeaderTitleStyle,
        headerTintColor: '#0F766E',
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen
        name="profile-setup"
        options={{
          headerShown: true,
          title: t('profile.setupTitle'),
          headerStyle: sharedHeaderStyle,
          headerTitleStyle: sharedHeaderTitleStyle,
        }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: t('paywall.title'),
          headerStyle: sharedHeaderStyle,
          headerTitleStyle: sharedHeaderTitleStyle,
        }}
      />
      <Stack.Screen
        name="subscription"
        options={{
          headerShown: true,
          title: t('settings.subscriptionScreen.title'),
          headerStyle: sharedHeaderStyle,
          headerTitleStyle: sharedHeaderTitleStyle,
        }}
      />
      <Stack.Screen
        name="generate-post"
        options={{
          headerShown: true,
          title: t('contentEngine.title'),
          headerStyle: sharedHeaderStyle,
          headerTitleStyle: sharedHeaderTitleStyle,
        }}
      />
      <Stack.Screen
        name="lead-detail"
        options={{
          headerShown: true,
          title: t('leadDetail.title'),
          headerStyle: sharedHeaderStyle,
          headerTitleStyle: sharedHeaderTitleStyle,
        }}
      />
      <Stack.Screen
        name="post-detail"
        options={{
          headerShown: true,
          title: t('postDetail.title'),
          headerStyle: sharedHeaderStyle,
          headerTitleStyle: sharedHeaderTitleStyle,
        }}
      />
    </Stack>
  );
}
