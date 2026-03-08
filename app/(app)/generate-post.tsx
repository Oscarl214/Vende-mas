import { useState, useEffect } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
} from 'react-native';
import { YStack, Text, XStack, Sheet } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InputField } from '@/components/ui/input';
import { useSession } from '@/hooks/use-session';
import { useSubscription } from '@/hooks/use-subscription';
import { generateContent } from '@/lib/ai';
import { getEffectiveBookingUrl } from '@/lib/booking';
import { createPost } from '@/lib/posts';
import { markOnboardingSeen, markMilestone } from '@/lib/onboarding';

const GOAL_KEYS = [
  'awareness',
  'promotion',
  'educational',
  'testimonial',
  'review_request',
] as const;

const PLATFORM_KEYS = ['facebook', 'instagram', 'tiktok', 'google_business'] as const;

const PLATFORM_ICONS: Record<string, string> = {
  facebook: 'logo-facebook',
  instagram: 'logo-instagram',
  tiktok: 'logo-tiktok',
  google_business: 'business',
};

type VoiceInputButtonComponent = React.ComponentType<{
  onTranscript: (text: string) => void;
  lang?: string;
  size?: number;
}>;

export default function GeneratePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user, profile } = useSession();
  const { canGeneratePost, refreshUsage } = useSubscription();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === 'true';

  const [VoiceInputButton, setVoiceInputButton] =
    useState<VoiceInputButtonComponent | null>(null);

  useEffect(() => {
    import('@/components/ui/voice-input-button')
      .then((m) => setVoiceInputButton(() => m.VoiceInputButton))
      .catch(() => setVoiceInputButton(null));
  }, []);

  const [goal, setGoal] = useState(isOnboarding ? 'promotion' : '');
  const [platform, setPlatform] = useState(isOnboarding ? 'facebook' : '');
  const [promotionDetails, setPromotionDetails] = useState(
    isOnboarding ? t('onboarding.defaultPromotion') : '',
  );
  const [maxLength, setMaxLength] = useState<string>('auto');
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [platformSheetOpen, setPlatformSheetOpen] = useState(false);
  const [successSheetOpen, setSuccessSheetOpen] = useState(false);

  const LENGTH_OPTIONS = [
    { key: 'auto', label: t('contentEngine.lengthAuto') },
    { key: 'short', label: t('contentEngine.lengthShort') },
    { key: 'medium', label: t('contentEngine.lengthMedium') },
    { key: 'long', label: t('contentEngine.lengthLong') },
  ] as const;

  const [generatedCaption, setGeneratedCaption] = useState('');
  const [savedPostId, setSavedPostId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const showResult = generatedCaption.length > 0;
  const formUrl = user
    ? getEffectiveBookingUrl(profile ?? null, user.id, savedPostId ?? undefined)
    : '';

  const handleGenerate = async () => {
    if (!goal || !platform) {
      Alert.alert(
        t('common.error'),
        !goal
          ? t('contentEngine.goalPlaceholder')
          : t('contentEngine.platformPlaceholder'),
      );
      return;
    }

    if (!canGeneratePost) {
      Alert.alert(t('contentEngine.limitReached'), t('contentEngine.limitMessage'));
      router.push('/(app)/paywall?reason=posts');
      return;
    }

    Keyboard.dismiss();
    setGenerating(true);
    setCopied(false);
    setCopiedLink(false);
    setSavedPostId(null);

    try {
      const result = await generateContent({
        contentGoal: goal,
        platform,
        promotionDetails: promotionDetails || undefined,
        maxLength: maxLength !== 'auto' ? maxLength : undefined,
        profile: {
          business_name: profile?.business_name ?? null,
          business_type: profile?.business_type ?? null,
          location: profile?.location ?? null,
          services_offered: profile?.services_offered ?? null,
          target_customer: profile?.target_customer ?? null,
          tone: profile?.tone ?? null,
          default_language: profile?.default_language ?? null,
        },
        bookingUrl: user ? getEffectiveBookingUrl(profile ?? null, user.id) : null,
      });
      setGeneratedCaption(result.caption);

      if (user && profile) {
        const post = await createPost(user.id, {
          business_profile_id: profile.id,
          content_type: goal,
          platform,
          prompt_notes: promotionDetails || undefined,
          generated_content: result.caption,
        });
        setSavedPostId(post.id);
        await refreshUsage();
        if (isOnboarding) {
          await markMilestone('first_post_created');
        }
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCaption = async () => {
    await Clipboard.setStringAsync(generatedCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (isOnboarding) {
      await markMilestone('first_post_shared');
      setSuccessSheetOpen(true);
    }
  };

  const handleCopyWithLink = async () => {
    const text = `${generatedCaption}\n\n${formUrl}`;
    await Clipboard.setStringAsync(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    if (isOnboarding) {
      await markMilestone('first_post_shared');
      setSuccessSheetOpen(true);
    }
  };

  const handleShare = async () => {
    const text = formUrl
      ? `${generatedCaption}\n\n${formUrl}`
      : generatedCaption;
    try {
      await Share.share({ message: text });
      if (isOnboarding) {
        await markMilestone('first_post_shared');
        setSuccessSheetOpen(true);
      }
    } catch {}
  };

  const handleGoToDashboard = async () => {
    setSuccessSheetOpen(false);
    await markOnboardingSeen();
    router.replace('/(app)/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <YStack padding="$5" gap="$4">
          {!showResult ? (
            <Animated.View key="configure" entering={FadeIn.duration(250)}>
              <YStack gap="$4">
                <YStack gap="$1">
                  <Text fontSize={22} fontWeight="bold" color="$brandSecondary">
                    {t('contentEngine.title')}
                  </Text>
                  <Text fontSize={14} color="$brandTextLight">
                    {profile?.business_name}
                  </Text>
                </YStack>

                {/* Content Goal Selector */}
                <YStack gap="$1.5">
                  <Text fontSize={14} fontWeight="500" color="$brandText">
                    {t('contentEngine.goalLabel')}
                  </Text>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setGoalSheetOpen(true);
                    }}
                  >
                    <XStack
                      borderRadius={12}
                      borderWidth={1}
                      borderColor="$brandBorder"
                      height={52}
                      paddingHorizontal={16}
                      alignItems="center"
                      backgroundColor="$background"
                    >
                      <Text
                        fontSize={16}
                        color={goal ? '$color' : '$brandTextLight'}
                        flex={1}
                      >
                        {goal
                          ? t(`contentEngine.goals.${goal}`)
                          : t('contentEngine.goalPlaceholder')}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
                    </XStack>
                  </Pressable>
                  <Sheet
                    open={goalSheetOpen}
                    onOpenChange={setGoalSheetOpen}
                    modal
                    dismissOnSnapToBottom
                    snapPointsMode="fit"
                  >
                    <Sheet.Frame padding="$4">
                      <Text
                        fontSize={16}
                        fontWeight="600"
                        color="$brandText"
                        marginBottom="$3"
                      >
                        {t('contentEngine.goalLabel')}
                      </Text>
                      {GOAL_KEYS.map((key) => (
                        <Pressable
                          key={key}
                          onPress={() => {
                            setGoal(key);
                            setGoalSheetOpen(false);
                          }}
                        >
                          <XStack
                            paddingVertical="$3"
                            paddingHorizontal="$2"
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <Text fontSize={16} color="$brandText">
                              {t(`contentEngine.goals.${key}`)}
                            </Text>
                            {goal === key && (
                              <Ionicons name="checkmark" size={20} color="#0F766E" />
                            )}
                          </XStack>
                        </Pressable>
                      ))}
                    </Sheet.Frame>
                    <Sheet.Overlay />
                  </Sheet>
                </YStack>

                {/* Platform Selector */}
                <YStack gap="$1.5">
                  <Text fontSize={14} fontWeight="500" color="$brandText">
                    {t('contentEngine.platformLabel')}
                  </Text>
                  <XStack gap="$2.5">
                    {PLATFORM_KEYS.map((key) => {
                      const selected = platform === key;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => setPlatform(key)}
                          style={{ flex: 1 }}
                        >
                          <Card
                            variant={selected ? 'outlined' : 'flat'}
                            borderColor={selected ? '$brandPrimary' : 'transparent'}
                            borderWidth={selected ? 2 : 0}
                            padding="$3"
                            alignItems="center"
                            gap="$2"
                          >
                            <Ionicons
                              name={PLATFORM_ICONS[key] as any}
                              size={24}
                              color={selected ? '#0F766E' : '#9CA3AF'}
                            />
                            <Text
                              fontSize={12}
                              fontWeight={selected ? '600' : '400'}
                              color={selected ? '$brandPrimary' : '$brandTextLight'}
                              textAlign="center"
                            >
                              {t(`contentEngine.platforms.${key}`)}
                            </Text>
                          </Card>
                        </Pressable>
                      );
                    })}
                  </XStack>
                </YStack>

                {/* Promotion Details */}
                {isOnboarding && (
                  <Text fontSize={13} color="$brandTextLight" fontStyle="italic">
                    {t('onboarding.guidedPromptHint')}
                  </Text>
                )}
                <XStack gap="$2" alignItems="flex-end">
                  <YStack flex={1}>
                    <InputField
                      label={t('contentEngine.promotionLabel')}
                      placeholder={t('contentEngine.promotionPlaceholder')}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      onChangeText={setPromotionDetails}
                      value={promotionDetails}
                      returnKeyType="done"
                      blurOnSubmit
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </YStack>
                  {VoiceInputButton && (
                    <VoiceInputButton
                      onTranscript={(text) =>
                        setPromotionDetails((prev) => (prev ? `${prev} ${text}` : text))
                      }
                      lang={profile?.default_language === 'es' ? 'es-MX' : 'en-US'}
                    />
                  )}
                </XStack>

                {/* Length selector */}
                <YStack gap="$1.5">
                  <Text fontSize={14} fontWeight="500" color="$brandText">
                    {t('contentEngine.lengthLabel')}
                  </Text>
                  <XStack gap="$2" flexWrap="wrap">
                    {LENGTH_OPTIONS.map(({ key, label }) => {
                      const active = maxLength === key;
                      return (
                        <Pressable key={key} onPress={() => setMaxLength(key)}>
                          <XStack
                            paddingHorizontal="$3"
                            paddingVertical="$2"
                            borderRadius={20}
                            backgroundColor={active ? '$brandPrimary' : '$brandBackground'}
                            borderWidth={active ? 0 : 1}
                            borderColor="$brandBorder"
                          >
                            <Text
                              fontSize={13}
                              fontWeight={active ? '600' : '400'}
                              color={active ? '$brandTextInverse' : '$brandTextLight'}
                            >
                              {label}
                            </Text>
                          </XStack>
                        </Pressable>
                      );
                    })}
                  </XStack>
                </YStack>

                <Button
                  variant="primary"
                  onPress={handleGenerate}
                  disabled={generating || !goal || !platform}
                  opacity={generating || !goal || !platform ? 0.6 : 1}
                  icon={
                    !generating ? (
                      <Ionicons name="sparkles" size={20} color="#fff" />
                    ) : undefined
                  }
                >
                  {generating
                    ? (isOnboarding ? t('onboarding.creatingPost') : t('contentEngine.generating'))
                    : t('contentEngine.generate')}
                </Button>
              </YStack>
            </Animated.View>
          ) : (
            <Animated.View key="result" entering={FadeIn.duration(300)}>
              <YStack gap="$4">
                <YStack gap="$1">
                  <Text fontSize={22} fontWeight="bold" color="$brandSecondary">
                    {isOnboarding
                      ? `✨ ${t('onboarding.postReady')}`
                      : t('contentEngine.resultTitle')}
                  </Text>
                  <XStack gap="$2" alignItems="center">
                    <Ionicons
                      name={PLATFORM_ICONS[platform] as any}
                      size={16}
                      color="#6B7280"
                    />
                    <Text fontSize={13} color="$brandTextLight">
                      {t(`contentEngine.platforms.${platform}`)} &middot;{' '}
                      {t(`contentEngine.goals.${goal}`)}
                    </Text>
                  </XStack>
                </YStack>

                {/* Generated caption */}
                <Card variant="elevated" padding="$4" gap="$3">
                  <Text
                    fontSize={15}
                    lineHeight={24}
                    color="$brandText"
                    selectable
                  >
                    {generatedCaption}
                  </Text>
                  {formUrl.length > 0 && savedPostId != null && (
                    <Text fontSize={13} color="$brandPrimary" selectable>
                      {formUrl}
                    </Text>
                  )}
                  {!isOnboarding && (
                    <XStack justifyContent="flex-end">
                      <Pressable onPress={handleCopyCaption}>
                        <XStack alignItems="center" gap="$1.5" paddingVertical="$1">
                          <Ionicons
                            name={copied ? 'checkmark-circle' : 'copy-outline'}
                            size={18}
                            color={copied ? '#16A34A' : '#0F766E'}
                          />
                          <Text
                            fontSize={13}
                            fontWeight="500"
                            color={copied ? '$brandSuccess' : '$brandPrimary'}
                          >
                            {copied
                              ? t('contentEngine.copied')
                              : t('contentEngine.copy')}
                          </Text>
                        </XStack>
                      </Pressable>
                    </XStack>
                  )}
                </Card>

                {isOnboarding ? (
                  <XStack gap="$3">
                    <Button
                      variant="outline"
                      onPress={handleCopyCaption}
                      flex={1}
                      icon={
                        <Ionicons
                          name={copied ? 'checkmark-circle' : 'copy-outline'}
                          size={18}
                          color={copied ? '#16A34A' : '#0F766E'}
                        />
                      }
                    >
                      {copied
                        ? t('contentEngine.copied')
                        : t('onboarding.copyPost')}
                    </Button>
                    <Button
                      variant="primary"
                      onPress={handleShare}
                      flex={1}
                      icon={
                        <Ionicons name="share-outline" size={18} color="#fff" />
                      }
                    >
                      {t('onboarding.sharePost')}
                    </Button>
                  </XStack>
                ) : (
                  <>
                    {/* Lead form link */}
                    {formUrl.length > 0 && savedPostId != null && (
                      <Card variant="outlined" padding="$3.5" gap="$2.5">
                        <XStack alignItems="center" gap="$2">
                          <Ionicons name="link" size={18} color="#0F766E" />
                          <Text fontSize={14} fontWeight="600" color="$brandSecondary">
                            {t('contentEngine.leadFormLink')}
                          </Text>
                        </XStack>
                        <Text
                          fontSize={12}
                          color="$brandTextLight"
                          lineHeight={18}
                        >
                          {t('contentEngine.leadFormHint')}
                        </Text>
                        <Card variant="flat" padding="$2.5" borderRadius={8}>
                          <Text
                            fontSize={12}
                            color="$brandPrimary"
                            numberOfLines={2}
                            selectable
                          >
                            {formUrl}
                          </Text>
                        </Card>
                        <Button
                          variant="primary"
                          height={44}
                          onPress={handleCopyWithLink}
                          icon={
                            <Ionicons
                              name={copiedLink ? 'checkmark-circle' : 'clipboard-outline'}
                              size={18}
                              color="#fff"
                            />
                          }
                        >
                          {copiedLink
                            ? t('contentEngine.copied')
                            : t('contentEngine.copyWithLink')}
                        </Button>
                      </Card>
                    )}

                    <XStack gap="$3">
                      <Button
                        variant="outline"
                        onPress={handleGenerate}
                        disabled={generating}
                        flex={1}
                        icon={
                          <Ionicons name="refresh" size={18} color="#0F766E" />
                        }
                      >
                        {generating
                          ? t('contentEngine.generating')
                          : t('contentEngine.regenerate')}
                      </Button>
                      <Button
                        variant="primary"
                        onPress={() => router.back()}
                        flex={1}
                      >
                        {t('contentEngine.done')}
                      </Button>
                    </XStack>
                  </>
                )}
              </YStack>
            </Animated.View>
          )}
        </YStack>
      </ScrollView>

      {/* Onboarding success reinforcement */}
      <Sheet
        open={successSheetOpen}
        onOpenChange={setSuccessSheetOpen}
        modal
        snapPointsMode="fit"
        dismissOnSnapToBottom={false}
      >
        <Sheet.Frame padding="$5">
          <YStack alignItems="center" gap="$4" paddingVertical="$3">
            <Text fontSize={40}>🎉</Text>
            <Text fontSize={24} fontWeight="bold" color="$brandSecondary" textAlign="center">
              {t('onboarding.successTitle')}
            </Text>
            <Text
              fontSize={15}
              color="$brandTextLight"
              textAlign="center"
              lineHeight={22}
            >
              {t('onboarding.successMessage')}
            </Text>
            <Button
              variant="primary"
              width="100%"
              marginTop="$2"
              onPress={handleGoToDashboard}
            >
              {t('onboarding.goToDashboard')}
            </Button>
          </YStack>
        </Sheet.Frame>
        <Sheet.Overlay />
      </Sheet>
    </KeyboardAvoidingView>
  );
}
