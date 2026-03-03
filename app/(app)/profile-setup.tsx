import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import { YStack, Text, XStack, Select, Adapt, Sheet } from 'tamagui';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useSession } from '@/hooks/use-session';
import { upsertProfile, uploadLogo } from '@/lib/profile';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

const TONE_KEYS = ['professional', 'friendly', 'casual', 'bold', 'inspirational', 'humorous'] as const;

const COLOR_PALETTE_COLORS = [
  { primary: '#0F766E', secondary: '#1F2937', accent: '#F97316' },
  { primary: '#2563EB', secondary: '#1E3A5F', accent: '#D97706' },
  { primary: '#7C3AED', secondary: '#312E81', accent: '#EC4899' },
  { primary: '#DC2626', secondary: '#1F2937', accent: '#F59E0B' },
  { primary: '#16A34A', secondary: '#14532D', accent: '#84CC16' },
  { primary: '#475569', secondary: '#1E293B', accent: '#06B6D4' },
];

type ProfileFormData = {
  business_name: string;
  business_type: string;
  location: string;
  services_offered: string;
  target_customer: string;
  tone: string;
  default_language: string;
  contact_phone?: string;
  contact_email?: string;
  website?: string;
};

function StepIndicator({ current, labels }: { current: number; labels: string[] }) {
  return (
    <XStack justifyContent="center" alignItems="center" marginBottom="$2">
      {labels.map((label, i) => (
        <XStack key={label} alignItems="center">
          <YStack alignItems="center" gap="$1.5">
            <XStack
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor={i <= current ? '$brandPrimary' : '$brandBorder'}
              justifyContent="center"
              alignItems="center"
            >
              {i < current ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Text
                  fontSize={14}
                  fontWeight="600"
                  color={i === current ? '$brandTextInverse' : '$brandTextLight'}
                >
                  {i + 1}
                </Text>
              )}
            </XStack>
            <Text
              fontSize={11}
              fontWeight={i === current ? '600' : '400'}
              color={i <= current ? '$brandPrimary' : '$brandTextLight'}
            >
              {label}
            </Text>
          </YStack>
          {i < labels.length - 1 && (
            <XStack
              width={40}
              height={2}
              backgroundColor={i < current ? '$brandPrimary' : '$brandBorder'}
              marginHorizontal="$2"
              marginBottom={20}
            />
          )}
        </XStack>
      ))}
    </XStack>
  );
}

function findPaletteIndex(brandColors: Record<string, string> | null | undefined): number {
  if (!brandColors?.primary) return 0;
  const idx = COLOR_PALETTE_COLORS.findIndex((p) => p.primary === brandColors.primary);
  return idx >= 0 ? idx : 0;
}

export default function ProfileSetupScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { editing } = useLocalSearchParams<{ editing?: string }>();
  const isEditing = editing === 'true';
  const { user, profile, refreshProfile } = useSession();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(
    isEditing ? (profile?.logo_url ?? null) : null,
  );
  const [selectedPalette, setSelectedPalette] = useState(
    isEditing ? findPaletteIndex(profile?.brand_colors) : 0,
  );
  const [toneOpen, setToneOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToInput = (yOffset: number) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 300);
  };

  const stepLabels = [
    t('profile.steps.business'),
    t('profile.steps.aiContent'),
    t('profile.steps.brand'),
    t('profile.steps.contact'),
  ];

  const businessTypes = t('profile.businessTypes', { returnObjects: true }) as string[];
  const toneOptions = t('profile.toneOptions', { returnObjects: true }) as string[];
  const languageOptions = t('profile.languageOptions', { returnObjects: true }) as Record<string, string>;
  const colorPaletteNames = t('profile.colorPalettes', { returnObjects: true }) as string[];

  const profileSchema = useMemo(
    () =>
      z.object({
        business_name: z.string().min(1, t('profile.validation.businessNameRequired')),
        business_type: z.string().min(1, t('profile.validation.businessTypeRequired')),
        location: z.string().min(1, t('profile.validation.locationRequired')),
        services_offered: z.string().min(1, t('profile.validation.servicesRequired')),
        target_customer: z.string().min(1, t('profile.validation.targetCustomerRequired')),
        tone: z.string().min(1, t('profile.validation.toneRequired')),
        default_language: z.string().min(1),
        contact_phone: z.string().optional(),
        contact_email: z.string().email(t('profile.validation.emailInvalid')).optional().or(z.literal('')),
        website: z.string().optional(),
      }),
    [t],
  );

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      business_name: isEditing ? (profile?.business_name ?? '') : '',
      business_type: isEditing ? (profile?.business_type ?? '') : '',
      location: isEditing ? (profile?.location ?? '') : '',
      services_offered: isEditing ? (profile?.services_offered ?? '') : '',
      target_customer: isEditing ? (profile?.target_customer ?? '') : '',
      tone: isEditing ? (profile?.tone ?? '') : '',
      default_language: isEditing ? (profile?.default_language ?? 'es') : 'es',
      contact_phone: isEditing ? (profile?.contact_phone ?? '') : '',
      contact_email: isEditing ? (profile?.contact_email ?? user?.email ?? '') : (user?.email ?? ''),
      website: isEditing ? (profile?.website ?? '') : '',
    },
  });

  useEffect(() => {
    navigation.setOptions(
      isEditing
        ? { title: t('profile.editTitle'), headerBackVisible: true, gestureEnabled: true }
        : { title: t('profile.setupTitle'), headerBackVisible: false, gestureEnabled: false },
    );
  }, [isEditing, navigation, t]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      const valid = await trigger(['business_name', 'business_type', 'location']);
      if (!valid) return;
    } else if (currentStep === 1) {
      const valid = await trigger(['services_offered', 'target_customer', 'tone']);
      if (!valid) return;
    }
    setCurrentStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setLoading(true);
    try {
      let logoUrl: string | undefined;
      if (logoUri) {
        logoUrl = await uploadLogo(user.id, logoUri);
      }

      const palette = COLOR_PALETTE_COLORS[selectedPalette];
      await upsertProfile(user.id, {
        ...data,
        logo_url: logoUrl,
        brand_colors: {
          primary: palette.primary,
          secondary: palette.secondary,
          accent: palette.accent,
        },
        profile_complete: true,
      });

      await refreshProfile();
      if (isEditing) {
        router.back();
      } else {
        router.replace('/(app)/(tabs)');
      }
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
        ref={scrollRef}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <YStack padding="$5" gap="$4">
          <StepIndicator current={currentStep} labels={stepLabels} />

          {currentStep === 0 && (
            <Animated.View key="step-0" entering={FadeIn.duration(250)}>
              <YStack gap="$4">
                <YStack gap="$1">
                  <Text fontSize={22} fontWeight="bold" color="$brandSecondary">
                    {t('profile.step0.title')}
                  </Text>
                  <Text fontSize={14} color="$brandTextLight">
                    {t('profile.step0.subtitle')}
                  </Text>
                </YStack>

                <Controller
                  control={control}
                  name="business_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <InputField
                      label={t('profile.step0.businessNameLabel')}
                      placeholder={t('profile.step0.businessNamePlaceholder')}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={value}
                      error={errors.business_name?.message}
                    />
                  )}
                />

                <YStack gap="$1.5">
                  <Text fontSize={14} fontWeight="500" color="$brandText">
                    {t('profile.step0.businessTypeLabel')}
                  </Text>
                  <Controller
                    control={control}
                    name="business_type"
                    render={({ field: { onChange, value } }) => (
                      <Select value={value} onValueChange={onChange} onOpenChange={(open: boolean) => {
                        if (open) Keyboard.dismiss();
                      }}>
                        <Select.Trigger
                          borderRadius={12}
                          borderWidth={1}
                          borderColor={errors.business_type ? '$brandError' : '$brandBorder'}
                          height={52}
                          paddingHorizontal={16}
                        >
                          <Select.Value placeholder={t('profile.step0.businessTypePlaceholder')} />
                        </Select.Trigger>

                        <Adapt when="sm" platform="touch">
                          <Sheet modal dismissOnSnapToBottom snapPointsMode="fit">
                            <Sheet.Frame>
                              <Sheet.ScrollView>
                                <Adapt.Contents />
                              </Sheet.ScrollView>
                            </Sheet.Frame>
                            <Sheet.Overlay />
                          </Sheet>
                        </Adapt>

                        <Select.Content>
                          <Select.Viewport>
                            <Select.Group>
                              <Select.Label>{t('profile.step0.businessTypeSheet')}</Select.Label>
                              {businessTypes.map((type, index) => (
                                <Select.Item key={type} value={type} index={index}>
                                  <Select.ItemText>{type}</Select.ItemText>
                                </Select.Item>
                              ))}
                            </Select.Group>
                          </Select.Viewport>
                        </Select.Content>
                      </Select>
                    )}
                  />
                  {errors.business_type && (
                    <Text fontSize={12} color="$brandError" paddingLeft="$2">
                      {errors.business_type.message}
                    </Text>
                  )}
                </YStack>

                <Controller
                  control={control}
                  name="location"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <InputField
                      label={t('profile.step0.locationLabel')}
                      placeholder={t('profile.step0.locationPlaceholder')}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={value}
                      error={errors.location?.message}
                      onFocus={() => scrollToInput(250)}
                    />
                  )}
                />
              </YStack>
            </Animated.View>
          )}

          {currentStep === 1 && (
            <Animated.View key="step-1" entering={FadeIn.duration(250)}>
              <YStack gap="$4">
                <YStack gap="$1">
                  <Text fontSize={22} fontWeight="bold" color="$brandSecondary">
                    {t('profile.step1.title')}
                  </Text>
                  <Text fontSize={14} color="$brandTextLight">
                    {t('profile.step1.subtitle')}
                  </Text>
                </YStack>

                <Controller
                  control={control}
                  name="services_offered"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <InputField
                      label={t('profile.step1.servicesLabel')}
                      placeholder={t('profile.step1.servicesPlaceholder')}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={value}
                      error={errors.services_offered?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="target_customer"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <InputField
                      label={t('profile.step1.targetCustomerLabel')}
                      placeholder={t('profile.step1.targetCustomerPlaceholder')}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={value}
                      error={errors.target_customer?.message}
                      onFocus={() => scrollToInput(200)}
                    />
                  )}
                />

                <YStack gap="$1.5">
                  <Text fontSize={14} fontWeight="500" color="$brandText">
                    {t('profile.step1.toneLabel')}
                  </Text>
                  <Controller
                    control={control}
                    name="tone"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Pressable onPress={() => { Keyboard.dismiss(); setToneOpen(true); }}>
                          <XStack
                            borderRadius={12}
                            borderWidth={1}
                            borderColor={errors.tone ? '$brandError' : '$brandBorder'}
                            height={52}
                            paddingHorizontal={16}
                            alignItems="center"
                            backgroundColor="$background"
                          >
                            <Text
                              fontSize={16}
                              color={value ? '$color' : '$brandTextLight'}
                              flex={1}
                            >
                              {value
                                ? toneOptions[TONE_KEYS.indexOf(value as typeof TONE_KEYS[number])]
                                : t('profile.step1.tonePlaceholder')}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
                          </XStack>
                        </Pressable>
                        <Sheet
                          open={toneOpen}
                          onOpenChange={setToneOpen}
                          modal
                          dismissOnSnapToBottom
                          snapPointsMode="fit"
                        >
                          <Sheet.Frame padding="$4">
                            <Text fontSize={16} fontWeight="600" color="$brandText" marginBottom="$3">
                              {t('profile.step1.toneSheet')}
                            </Text>
                            {TONE_KEYS.map((key, index) => (
                              <Pressable
                                key={key}
                                onPress={() => { onChange(key); setToneOpen(false); }}
                              >
                                <XStack
                                  paddingVertical="$3"
                                  paddingHorizontal="$2"
                                  alignItems="center"
                                  justifyContent="space-between"
                                >
                                  <Text fontSize={16} color="$brandText">
                                    {toneOptions[index]}
                                  </Text>
                                  {value === key && (
                                    <Ionicons name="checkmark" size={20} color="#0F766E" />
                                  )}
                                </XStack>
                              </Pressable>
                            ))}
                          </Sheet.Frame>
                          <Sheet.Overlay />
                        </Sheet>
                      </>
                    )}
                  />
                  {errors.tone && (
                    <Text fontSize={12} color="$brandError" paddingLeft="$2">
                      {errors.tone.message}
                    </Text>
                  )}
                </YStack>

                <YStack gap="$1.5">
                  <Text fontSize={14} fontWeight="500" color="$brandText">
                    {t('profile.step1.languageLabel')}
                  </Text>
                  <Controller
                    control={control}
                    name="default_language"
                    render={({ field: { onChange, value } }) => (
                      <Select value={value} onValueChange={onChange}>
                        <Select.Trigger
                          borderRadius={12}
                          borderWidth={1}
                          borderColor="$brandBorder"
                          height={52}
                          paddingHorizontal={16}
                        >
                          <Select.Value placeholder={t('profile.step1.languagePlaceholder')} />
                        </Select.Trigger>

                        <Adapt when="sm" platform="touch">
                          <Sheet modal dismissOnSnapToBottom snapPointsMode="fit">
                            <Sheet.Frame>
                              <Sheet.ScrollView>
                                <Adapt.Contents />
                              </Sheet.ScrollView>
                            </Sheet.Frame>
                            <Sheet.Overlay />
                          </Sheet>
                        </Adapt>

                        <Select.Content>
                          <Select.Viewport>
                            <Select.Group>
                              <Select.Label>{t('profile.step1.languageSheet')}</Select.Label>
                              {Object.entries(languageOptions).map(([code, label], index) => (
                                <Select.Item key={code} value={code} index={index}>
                                  <Select.ItemText>{label}</Select.ItemText>
                                </Select.Item>
                              ))}
                            </Select.Group>
                          </Select.Viewport>
                        </Select.Content>
                      </Select>
                    )}
                  />
                </YStack>
              </YStack>
            </Animated.View>
          )}

          {currentStep === 2 && (
            <Animated.View key="step-2" entering={FadeIn.duration(250)}>
              <YStack gap="$4">
                <YStack gap="$1">
                  <Text fontSize={22} fontWeight="bold" color="$brandSecondary">
                    {t('profile.step2.title')}
                  </Text>
                  <Text fontSize={14} color="$brandTextLight">
                    {t('profile.step2.subtitle')}
                  </Text>
                </YStack>

                <Card variant="flat" alignItems="center" padding="$5" gap="$3">
                  {logoUri ? (
                    <Image
                      source={{ uri: logoUri }}
                      style={{ width: 100, height: 100, borderRadius: 50 }}
                    />
                  ) : (
                    <XStack
                      width={100}
                      height={100}
                      borderRadius={50}
                      backgroundColor="$brandBorder"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Ionicons name="camera-outline" size={36} color="#9CA3AF" />
                    </XStack>
                  )}
                  <Button variant="ghost" onPress={pickImage} height={40}>
                    {logoUri ? t('profile.step2.changeLogo') : t('profile.step2.uploadLogo')}
                  </Button>
                </Card>

                <YStack gap="$2">
                  <Text fontSize={14} fontWeight="500" color="$brandText">
                    {t('profile.step2.brandColors')}
                  </Text>
                  <YStack gap="$2.5">
                    {COLOR_PALETTE_COLORS.map((palette, i) => {
                      const isSelected = selectedPalette === i;
                      return (
                        <Pressable key={colorPaletteNames[i]} onPress={() => setSelectedPalette(i)}>
                          <Card
                            variant={isSelected ? 'outlined' : 'flat'}
                            borderColor={isSelected ? '$brandPrimary' : 'transparent'}
                            borderWidth={isSelected ? 2 : 0}
                            padding="$3"
                          >
                            <XStack alignItems="center" gap="$3">
                              <XStack borderRadius={8} overflow="hidden">
                                <XStack width={28} height={28} backgroundColor={palette.primary} />
                                <XStack width={28} height={28} backgroundColor={palette.secondary} />
                                <XStack width={28} height={28} backgroundColor={palette.accent} />
                              </XStack>
                              <Text
                                fontSize={14}
                                fontWeight={isSelected ? '600' : '400'}
                                color="$brandText"
                                flex={1}
                              >
                                {colorPaletteNames[i]}
                              </Text>
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={22} color="#0F766E" />
                              )}
                            </XStack>
                          </Card>
                        </Pressable>
                      );
                    })}
                  </YStack>
                </YStack>
              </YStack>
            </Animated.View>
          )}

          {currentStep === 3 && (
            <Animated.View key="step-3" entering={FadeIn.duration(250)}>
              <YStack gap="$4">
                <YStack gap="$1">
                  <Text fontSize={22} fontWeight="bold" color="$brandSecondary">
                    {t('profile.step3.title')}
                  </Text>
                  <Text fontSize={14} color="$brandTextLight">
                    {t('profile.step3.subtitle')}
                  </Text>
                </YStack>

                <Controller
                  control={control}
                  name="contact_phone"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <InputField
                      label={t('profile.step3.phoneLabel')}
                      placeholder={t('profile.step3.phonePlaceholder')}
                      keyboardType="phone-pad"
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={value}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="contact_email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <InputField
                      label={t('profile.step3.emailLabel')}
                      placeholder={t('profile.step3.emailPlaceholder')}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={value}
                      error={errors.contact_email?.message}
                      onFocus={() => scrollToInput(200)}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="website"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <InputField
                      label={t('profile.step3.websiteLabel')}
                      placeholder={t('profile.step3.websitePlaceholder')}
                      autoCapitalize="none"
                      keyboardType="url"
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={value}
                      onFocus={() => scrollToInput(300)}
                    />
                  )}
                />
              </YStack>
            </Animated.View>
          )}

          <XStack gap="$3" marginTop="$2">
            {currentStep > 0 && (
              <Button variant="outline" onPress={handleBack} flex={1}>
                {t('common.back')}
              </Button>
            )}
            {currentStep < 3 ? (
              <Button variant="primary" onPress={handleNext} flex={1}>
                {t('common.next')}
              </Button>
            ) : (
              <Button
                variant="primary"
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
                opacity={loading ? 0.7 : 1}
                flex={1}
              >
                {loading ? t('common.saving') : isEditing ? t('common.save') : t('common.start')}
              </Button>
            )}
          </XStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
