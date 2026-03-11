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
import { signUpWithEmail, signInWithGoogle } from '@/lib/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type SignUpFormData = { email: string; password: string; confirmPassword: string };

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const signUpSchema = useMemo(
    () =>
      z
        .object({
          email: z.string().email(t('auth.signUp.validation.emailInvalid')),
          password: z.string().min(6, t('auth.signUp.validation.passwordMin')),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('auth.signUp.validation.passwordMismatch'),
          path: ['confirmPassword'],
        }),
    [t],
  );

  const { control, handleSubmit, formState: { errors } } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: SignUpFormData) => {
    setLoading(true);
    try {
      await signUpWithEmail(data.email, data.password);
      Alert.alert(
        t('auth.signUp.verifyEmail.title'),
        t('auth.signUp.verifyEmail.message'),
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
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
              {t('auth.signUp.title')}
            </Text>
            <Text fontSize={15} color="$brandTextLight" lineHeight={22}>
              {t('auth.signUp.subtitle')}
            </Text>
          </YStack>

          {/* Form */}
          <YStack gap="$4">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <InputField
                  label={t('auth.signUp.emailLabel')}
                  placeholder={t('auth.signUp.emailPlaceholder')}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <InputField
                  label={t('auth.signUp.passwordLabel')}
                  placeholder={t('auth.signUp.passwordPlaceholder')}
                  secureTextEntry
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <InputField
                  label={t('auth.signUp.confirmPasswordLabel')}
                  placeholder={t('auth.signUp.confirmPasswordPlaceholder')}
                  secureTextEntry
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.confirmPassword?.message}
                />
              )}
            />
          </YStack>

          <Button
            variant="primary"
            height={54}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            opacity={loading ? 0.7 : 1}
          >
            {loading ? t('auth.signUp.submitting') : t('auth.signUp.submit')}
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
              onPress={handleGoogleSignUp}
              disabled={loading}
              icon={<Ionicons name="logo-google" size={18} color="#4285F4" />}
            >
              {t('auth.signUp.continueGoogle')}
            </Button>

            <Button
              variant="outline"
              height={50}
              onPress={() => router.push('/(auth)/verify-otp')}
              disabled={loading}
              icon={<Ionicons name="call-outline" size={18} color="#374151" />}
            >
              {t('auth.signUp.continuePhone')}
            </Button>
          </YStack>

          {/* Footer */}
          <XStack justifyContent="center" gap="$1" marginTop="$2">
            <Text fontSize={14} color="$brandTextLight">
              {t('auth.signUp.hasAccount')}
            </Text>
            <Text
              fontSize={14}
              fontWeight="700"
              color="$brandPrimary"
              onPress={() => router.push('/(auth)/sign-in')}
            >
              {t('auth.signUp.signIn')}
            </Text>
          </XStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
