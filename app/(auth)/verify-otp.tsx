import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, Text, XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input';
import { signInWithPhone, verifyOtp } from '@/lib/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PhoneFormData = { phone: string };
type OtpFormData = { code: string };

export default function VerifyOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const phoneSchema = useMemo(
    () => z.object({ phone: z.string().min(10, t('auth.verifyOtp.validation.phoneInvalid')) }),
    [t],
  );
  const otpSchema = useMemo(
    () => z.object({ code: z.string().length(6, t('auth.verifyOtp.validation.codeLength')) }),
    [t],
  );

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '' },
  });

  const handleSendCode = async (data: PhoneFormData) => {
    setLoading(true);
    try {
      await signInWithPhone(data.phone);
      setPhone(data.phone);
      setStep('otp');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (data: OtpFormData) => {
    setLoading(true);
    try {
      await verifyOtp(phone, data.code);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      await signInWithPhone(phone);
      Alert.alert(
        t('auth.verifyOtp.codeResent.title'),
        t('auth.verifyOtp.codeResent.message'),
      );
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
      <YStack
        flex={1}
        padding="$6"
        paddingTop={insets.top + 20}
        backgroundColor="$brandBackground"
        gap="$4"
      >
        <YStack gap="$2" marginBottom="$4">
          <Text fontSize={28} fontWeight="bold" color="$brandSecondary">
            {step === 'phone' ? t('auth.verifyOtp.phoneTitle') : t('auth.verifyOtp.otpTitle')}
          </Text>
          <Text fontSize={16} color="$brandTextLight">
            {step === 'phone'
              ? t('auth.verifyOtp.phoneSubtitle')
              : t('auth.verifyOtp.otpSubtitle', { phone })}
          </Text>
        </YStack>

        {step === 'phone' ? (
          <>
            <Controller
              control={phoneForm.control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <InputField
                  label={t('auth.verifyOtp.phoneLabel')}
                  placeholder={t('auth.verifyOtp.phonePlaceholder')}
                  keyboardType="phone-pad"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={phoneForm.formState.errors.phone?.message}
                />
              )}
            />

            <Button
              variant="primary"
              onPress={phoneForm.handleSubmit(handleSendCode)}
              disabled={loading}
              opacity={loading ? 0.7 : 1}
              marginTop="$2"
            >
              {loading ? t('auth.verifyOtp.sendingCode') : t('auth.verifyOtp.sendCode')}
            </Button>
          </>
        ) : (
          <>
            <Controller
              control={otpForm.control}
              name="code"
              render={({ field: { onChange, onBlur, value } }) => (
                <InputField
                  label={t('auth.verifyOtp.otpLabel')}
                  placeholder={t('auth.verifyOtp.otpPlaceholder')}
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={otpForm.formState.errors.code?.message}
                />
              )}
            />

            <Button
              variant="primary"
              onPress={otpForm.handleSubmit(handleVerifyCode)}
              disabled={loading}
              opacity={loading ? 0.7 : 1}
              marginTop="$2"
            >
              {loading ? t('auth.verifyOtp.verifying') : t('auth.verifyOtp.verifyCode')}
            </Button>

            <XStack justifyContent="center" marginTop="$2">
              <Text
                fontSize={14}
                color="$brandPrimary"
                fontWeight="500"
                onPress={handleResendCode}
              >
                {t('auth.verifyOtp.resendCode')}
              </Text>
            </XStack>
          </>
        )}

        <XStack justifyContent="center" marginTop="$4">
          <Text
            fontSize={14}
            color="$brandTextLight"
            onPress={() => router.back()}
          >
            {t('auth.verifyOtp.goBack')}
          </Text>
        </XStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}
