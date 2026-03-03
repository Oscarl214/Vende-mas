import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { YStack, Text, XStack, Separator } from 'tamagui';
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
          padding="$6"
          paddingTop={insets.top + 20}
          backgroundColor="$brandBackground"
          gap="$4"
        >
          <YStack gap="$2" marginBottom="$4">
            <Text fontSize={28} fontWeight="bold" color="$brandSecondary">
              {t('auth.signIn.title')}
            </Text>
            <Text fontSize={16} color="$brandTextLight">
              {t('auth.signIn.subtitle')}
            </Text>
          </YStack>

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
            fontSize={14}
            color="$brandPrimary"
            fontWeight="500"
            alignSelf="flex-end"
            onPress={handleForgotPassword}
          >
            {t('auth.signIn.forgotPassword')}
          </Text>

          <Button
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            opacity={loading ? 0.7 : 1}
            marginTop="$2"
          >
            {loading ? t('auth.signIn.submitting') : t('auth.signIn.submit')}
          </Button>

          <XStack alignItems="center" gap="$3" marginVertical="$2">
            <Separator flex={1} />
            <Text fontSize={14} color="$brandTextLight">{t('common.or')}</Text>
            <Separator flex={1} />
          </XStack>

          <Button
            variant="outline"
            onPress={handleGoogleSignIn}
            disabled={loading}
            icon={<Ionicons name="logo-google" size={20} color="#4285F4" />}
          >
            {t('auth.signIn.continueGoogle')}
          </Button>

          <Button
            variant="outline"
            onPress={() => router.push('/(auth)/verify-otp')}
            disabled={loading}
            icon={<Ionicons name="call-outline" size={20} color="#333" />}
          >
            {t('auth.signIn.continuePhone')}
          </Button>

          <XStack justifyContent="center" marginTop="$4">
            <Text fontSize={14} color="$brandTextLight">
              {t('auth.signIn.noAccount')}
            </Text>
            <Text
              fontSize={14}
              fontWeight="600"
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
