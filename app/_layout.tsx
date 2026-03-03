import { useEffect } from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from 'tamagui';
import { PortalProvider } from '@tamagui/portal';
import config from '@/tamagui.config';
import { AuthProvider } from '@/providers/auth-provider';
import { SubscriptionProvider } from '@/providers/subscription-provider';
import { LanguageProvider } from '@/providers/language-provider';
import { useSession } from '@/hooks/use-session';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

function AuthGate() {
  const { session, profile, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (session && inAuthGroup) {
      if (!profile || !profile.profile_complete) {
        router.replace('/(app)/profile-setup');
      } else {
        router.replace('/(app)/(tabs)');
      }
    }
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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/3ad822b0-6755-45d8-890c-0aaaa8147adc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_layout.tsx:RootLayout',message:'RootLayout rendering with PortalProvider',data:{hasPortalProvider:true},timestamp:Date.now(),hypothesisId:'H1,H3'})}).catch(()=>{});
  // #endregion
  return (
    <LanguageProvider>
      <TamaguiProvider config={config} defaultTheme="light">
        <PortalProvider shouldAddRootHost>
          <ThemeProvider value={DefaultTheme}>
            <AuthProvider>
              <SubscriptionProvider>
                <AuthGate />
                <StatusBar style="auto" />
              </SubscriptionProvider>
            </AuthProvider>
          </ThemeProvider>
        </PortalProvider>
      </TamaguiProvider>
    </LanguageProvider>
  );
}
