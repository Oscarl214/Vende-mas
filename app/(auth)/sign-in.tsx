import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { YStack, Text, XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input';
import { signInWithEmail, signInWithGoogle, resetPassword } from '@/lib/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type SignInFormData = { email: string; password: string };

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const signInSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('auth.signIn.validation.emailInvalid')),
        password: z.string().min(1, t('auth.signIn.validation.passwordRequired')),
      }),
    [t],
  );

  const { control, handleSubmit, formState: { errors }, getValues } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: SignInFormData) => {
    setLoading(true);
    try {
      await signInWithEmail(data.email, data.password);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = getValues('email');
    if (!email) {
      Alert.alert(
        t('auth.signIn.forgotPasswordAlert.title'),
        t('auth.signIn.forgotPasswordAlert.message'),
      );
      return;
    }
    try {
      await resetPassword(email);
      Alert.alert(
        t('auth.signIn.emailSent.title'),
        t('auth.signIn.emailSent.message'),
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack
          flex={1}
          paddingHorizontal="$6"
          paddingTop={insets.top + 24}
          paddingBottom="$6"
          backgroundColor="$brandBackground"
          gap="$5"
        >
          {/* Brand mark */}
          <YStack alignItems="flex-start" gap="$1" marginBottom="$2">
            <XStack
              width={44}
              height={44}
              borderRadius={13}
              backgroundColor="$brandPrimary"
              justifyContent="center"
              alignItems="center"
              marginBottom="$3"
              style={{
                shadowColor: '#0F766E',
                shadowOpacity: 0.25,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 5 },
              }}
            >
              <Text fontSize={20} fontWeight="800" color="$brandTextInverse" letterSpacing={-1}>
                V
              </Text>
            </XStack>
            <Text fontSize={28} fontWeight="800" color="$brandSecondary" letterSpacing={-0.5}>
              {t('auth.signIn.title')}
            </Text>
            <Text fontSize={15} color="$brandTextLight" lineHeight={22}>
              {t('auth.signIn.subtitle')}
            </Text>
          </YStack>

          {/* Form */}
          <YStack gap="$4">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <InputField
                  label={t('auth.signIn.emailLabel')}
                  placeholder={t('auth.signIn.emailPlaceholder')}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />

            <YStack gap="$1">
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <InputField
                    label={t('auth.signIn.passwordLabel')}
                    placeholder={t('auth.signIn.passwordPlaceholder')}
                    secureTextEntry
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                    error={errors.password?.message}
                  />
                )}
              />
              <Text
                fontSize={13}
                color="$brandPrimary"
                fontWeight="600"
                alignSelf="flex-end"
                marginTop="$1"
                onPress={handleForgotPassword}
              >
                {t('auth.signIn.forgotPassword')}
              </Text>
            </YStack>
          </YStack>

          <Button
            variant="primary"
            height={54}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            opacity={loading ? 0.7 : 1}
          >
            {loading ? t('auth.signIn.submitting') : t('auth.signIn.submit')}
          </Button>

          {/* Divider */}
          <XStack alignItems="center" gap="$3">
            <YStack flex={1} height={1} backgroundColor="$brandBorder" />
            <Text fontSize={12} fontWeight="600" color="$brandTextLight" letterSpacing={0.5} textTransform="uppercase">
              {t('common.or')}
            </Text>
            <YStack flex={1} height={1} backgroundColor="$brandBorder" />
          </XStack>

          {/* Social buttons */}
          <YStack gap="$2.5">
            <Button
              variant="outline"
              height={50}
              onPress={handleGoogleSignIn}
              disabled={loading}
              icon={<Ionicons name="logo-google" size={18} color="#4285F4" />}
            >
              {t('auth.signIn.continueGoogle')}
            </Button>

            <Button
              variant="outline"
              height={50}
              onPress={() => router.push('/(auth)/verify-otp')}
              disabled={loading}
              icon={<Ionicons name="call-outline" size={18} color="#374151" />}
            >
              {t('auth.signIn.continuePhone')}
            </Button>
          </YStack>

          {/* Footer */}
          <XStack justifyContent="center" gap="$1" marginTop="$2">
            <Text fontSize={14} color="$brandTextLight">
              {t('auth.signIn.noAccount')}
            </Text>
            <Text
              fontSize={14}
              fontWeight="700"
              color="$brandPrimary"
              onPress={() => router.push('/(auth)/sign-up')}
            >
              {t('auth.signIn.createAccount')}
            </Text>
          </XStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
