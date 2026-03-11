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
import { Ionicons } from '@expo/vector-icons';

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
        paddingHorizontal="$6"
        paddingTop={insets.top + 24}
        paddingBottom="$6"
        backgroundColor="$brandBackground"
        gap="$5"
      >
        {/* Step indicator */}
        <XStack gap="$2" alignItems="center">
          <XStack
            width={28}
            height={28}
            borderRadius={14}
            backgroundColor={step === 'phone' ? '$brandPrimary' : '$brandSuccess'}
            justifyContent="center"
            alignItems="center"
          >
            {step === 'otp' ? (
              <Ionicons name="checkmark" size={14} color="#fff" />
            ) : (
              <Text fontSize={12} fontWeight="700" color="$brandTextInverse">1</Text>
            )}
          </XStack>
          <YStack flex={1} height={2} backgroundColor={step === 'otp' ? '$brandPrimary' : '$brandBorder'} borderRadius={1} />
          <XStack
            width={28}
            height={28}
            borderRadius={14}
            backgroundColor={step === 'otp' ? '$brandPrimary' : '$brandBorder'}
            justifyContent="center"
            alignItems="center"
          >
            <Text fontSize={12} fontWeight="700" color={step === 'otp' ? '$brandTextInverse' : '$brandTextLight'}>
              2
            </Text>
          </XStack>
        </XStack>

        {/* Header */}
        <YStack gap="$1.5">
          <XStack
            width={48}
            height={48}
            borderRadius={15}
            backgroundColor={step === 'otp' ? 'rgba(15,118,110,0.1)' : 'rgba(37,99,235,0.1)'}
            justifyContent="center"
            alignItems="center"
            marginBottom="$2"
          >
            <Ionicons
              name={step === 'phone' ? 'call' : 'shield-checkmark'}
              size={22}
              color={step === 'phone' ? '#2563EB' : '#0F766E'}
            />
          </XStack>
          <Text fontSize={26} fontWeight="800" color="$brandSecondary" letterSpacing={-0.5}>
            {step === 'phone' ? t('auth.verifyOtp.phoneTitle') : t('auth.verifyOtp.otpTitle')}
          </Text>
          <Text fontSize={15} color="$brandTextLight" lineHeight={22}>
            {step === 'phone'
              ? t('auth.verifyOtp.phoneSubtitle')
              : t('auth.verifyOtp.otpSubtitle', { phone })}
          </Text>
        </YStack>

        {step === 'phone' ? (
          <YStack gap="$4">
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
              height={54}
              onPress={phoneForm.handleSubmit(handleSendCode)}
              disabled={loading}
              opacity={loading ? 0.7 : 1}
            >
              {loading ? t('auth.verifyOtp.sendingCode') : t('auth.verifyOtp.sendCode')}
            </Button>
          </YStack>
        ) : (
          <YStack gap="$4">
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
              height={54}
              onPress={otpForm.handleSubmit(handleVerifyCode)}
              disabled={loading}
              opacity={loading ? 0.7 : 1}
            >
              {loading ? t('auth.verifyOtp.verifying') : t('auth.verifyOtp.verifyCode')}
            </Button>

            <XStack justifyContent="center">
              <Text
                fontSize={14}
                color="$brandPrimary"
                fontWeight="600"
                onPress={handleResendCode}
              >
                {t('auth.verifyOtp.resendCode')}
              </Text>
            </XStack>
          </YStack>
        )}

        <XStack justifyContent="center" marginTop="$2">
          <Text
            fontSize={14}
            color="$brandTextLight"
            fontWeight="500"
            onPress={() => router.back()}
          >
            {t('auth.verifyOtp.goBack')}
          </Text>
        </XStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}
