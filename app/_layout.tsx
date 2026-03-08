import { useEffect } from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from 'tamagui';
import { PortalProvider } from '@tamagui/portal';
import config from '@/tamagui.config';
import { AuthProvider } from '@/providers/auth-provider';
import { SubscriptionProvider } from '@/providers/subscription-provider';
import { NotificationProvider } from '@/providers/notification-provider';
import { LanguageProvider } from '@/providers/language-provider';
import { useSession } from '@/hooks/use-session';
import { hasSeenOnboarding } from '@/lib/onboarding';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

function AuthGate() {
  const { session, profile, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const navigate = async () => {
      const inAuthGroup = segments[0] === '(auth)';
      const inAppGroup = segments[0] === '(app)';
      const needsProfile = session && (!profile || !profile.profile_complete);

      if (!session && !inAuthGroup) {
        router.replace('/(auth)/welcome');
      } else if (session && inAuthGroup) {
        if (needsProfile) {
          router.replace('/(app)/profile-setup');
        } else {
          const seen = await hasSeenOnboarding();
          if (!seen) {
            router.replace('/(app)/onboarding');
          } else {
            router.replace('/(app)/(tabs)');
          }
        }
      } else if (needsProfile && inAppGroup) {
        router.replace('/(app)/profile-setup');
      } else if (session && profile?.profile_complete && inAppGroup) {
        const currentScreen = segments[1];
        if (currentScreen !== 'onboarding' && currentScreen !== 'generate-post') {
          const seen = await hasSeenOnboarding();
          if (!seen) {
            router.replace('/(app)/onboarding');
          }
        }
      }
    };

    navigate();
  }, [session, profile, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <TamaguiProvider config={config} defaultTheme="light">
        <PortalProvider shouldAddRootHost>
          <ThemeProvider value={DefaultTheme}>
            <AuthProvider>
              <SubscriptionProvider>
                <NotificationProvider>
                  <AuthGate />
                  <StatusBar style="auto" />
                </NotificationProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </ThemeProvider>
        </PortalProvider>
      </TamaguiProvider>
    </LanguageProvider>
  );
}
