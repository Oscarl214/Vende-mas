import { useState, useEffect } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
import { PostPreviewCard } from '@/components/ui/post-preview-card';
import { PostStrengthBadge } from '@/components/ui/post-strength-badge';
import { useSession } from '@/hooks/use-session';
import { useSubscription } from '@/hooks/use-subscription';
import { generateContent, type PostStrength } from '@/lib/ai';
import { getEffectiveBookingUrl } from '@/lib/booking';
import { createPost, getTopPosts } from '@/lib/posts';
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

  const [contextImageUri, setContextImageUri] = useState<string | null>(null);
  const [contextImageBase64, setContextImageBase64] = useState<string | null>(null);
  const [testimonialText, setTestimonialText] = useState('');

  const [generatedCaption, setGeneratedCaption] = useState('');
  const [postStrength, setPostStrength] = useState<PostStrength | null>(null);
  const [savedPostId, setSavedPostId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [editing, setEditing] = useState(false);

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
    setPostStrength(null);
    setEditing(false);

    try {
      // Fetch top posts for AI context — silently skip if unavailable
      let topPosts: Array<{ content: string; clicks: number; platform: string | null }> = [];
      if (user) {
        try {
          const posts = await getTopPosts(user.id);
          topPosts = posts.map((p) => ({ content: p.generated_content, clicks: p.click_count, platform: p.platform }));
        } catch {
          // optional — don't block generation
        }
      }

      const result = await generateContent({
        contentGoal: goal,
        platform,
        promotionDetails: promotionDetails || undefined,
        maxLength: maxLength !== 'auto' ? maxLength : undefined,
        contextImageBase64: contextImageBase64 ?? undefined,
        testimonialText: goal === 'testimonial' ? (testimonialText || undefined) : undefined,
        topPosts: topPosts.length > 0 ? topPosts : undefined,
        currentDate: new Date().toISOString(),
        profile: {
          business_name: profile?.business_name ?? null,
          business_type: profile?.business_type ?? null,
          location: profile?.location ?? null,
          services_offered: profile?.services_offered ?? null,
          target_customer: profile?.target_customer ?? null,
          tone: profile?.tone ?? null,
          default_language: profile?.default_language ?? null,
          specialties: profile?.specialties ?? null,
          pricing_info: profile?.pricing_info ?? null,
        },
        bookingUrl: user ? getEffectiveBookingUrl(profile ?? null, user.id) : null,
      });
      setGeneratedCaption(result.caption);
      if (result.postStrength) setPostStrength(result.postStrength);

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

  const handlePickContextImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.error'), t('contentEngine.photoPermissionDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setContextImageUri(result.assets[0].uri);
      setContextImageBase64(result.assets[0].base64 ?? null);
    }
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

                {/* Testimonial input — shown only when goal is testimonial */}
                {goal === 'testimonial' && (
                  <InputField
                    label={t('contentEngine.testimonialLabel')}
                    placeholder={t('contentEngine.testimonialPlaceholder')}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    onChangeText={setTestimonialText}
                    value={testimonialText}
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                )}

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

                {/* Context Image */}
                <YStack gap="$1.5">
                  <Text fontSize={14} fontWeight="500" color="$brandText">
                    {t('contentEngine.contextImageLabel')}
                  </Text>
                  {contextImageUri ? (
                    <XStack alignItems="flex-start" gap="$3">
                      <XStack style={{ position: 'relative' }}>
                        <Image
                          source={{ uri: contextImageUri }}
                          style={{ width: 90, height: 90, borderRadius: 10 }}
                          resizeMode="cover"
                        />
                        <Pressable
                          onPress={() => {
                            setContextImageUri(null);
                            setContextImageBase64(null);
                          }}
                          style={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            backgroundColor: '#EF4444',
                            borderRadius: 12,
                            width: 24,
                            height: 24,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                        </Pressable>
                      </XStack>
                      <YStack flex={1} justifyContent="center" gap="$1">
                        <Text fontSize={13} fontWeight="500" color="$brandText">
                          {t('contentEngine.contextImageAdded')}
                        </Text>
                        <Text fontSize={12} color="$brandTextLight" lineHeight={17}>
                          {t('contentEngine.contextImageHint')}
                        </Text>
                      </YStack>
                    </XStack>
                  ) : (
                    <Pressable onPress={handlePickContextImage}>
                      <XStack
                        borderRadius={12}
                        borderWidth={1.5}
                        borderColor="$brandBorder"
                        height={72}
                        alignItems="center"
                        justifyContent="center"
                        gap="$2"
                        backgroundColor="$brandBackground"
                      >
                        <Ionicons name="image-outline" size={20} color="#9CA3AF" />
                        <Text fontSize={14} color="$brandTextLight">
                          {t('contentEngine.contextImagePlaceholder')}
                        </Text>
                      </XStack>
                    </Pressable>
                  )}
                </YStack>

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
                {/* Title */}
                <YStack gap="$1">
                  <Text fontSize={22} fontWeight="bold" color="$brandSecondary">
                    {isOnboarding
                      ? `✨ ${t('onboarding.postReady')}`
                      : t('contentEngine.resultTitle')}
                  </Text>
                </YStack>

                {/* "Optimized for" pill */}
                <XStack alignItems="center" gap="$2">
                  <XStack
                    backgroundColor="$brandBackground"
                    borderRadius={20}
                    paddingHorizontal="$3"
                    paddingVertical="$1.5"
                    alignItems="center"
                    gap="$1.5"
                  >
                    <Ionicons
                      name={PLATFORM_ICONS[platform] as any}
                      size={14}
                      color="#0F766E"
                    />
                    <Text fontSize={12} fontWeight="600" color="$brandPrimary">
                      {t('contentEngine.optimizedFor', {
                        platform: t(`contentEngine.platforms.${platform}`),
                      })}
                    </Text>
                  </XStack>
                </XStack>

                {/* Platform preview card */}
                {editing ? (
                  <Card variant="outlined" padding="$3" gap="$2.5">
                    <Text fontSize={13} fontWeight="600" color="$brandText">
                      {t('contentEngine.editCaption')}
                    </Text>
                    <TextInput
                      style={{
                        fontSize: 15,
                        lineHeight: 23,
                        color: '#1C1E21',
                        borderWidth: 1,
                        borderColor: '#D1D5DB',
                        borderRadius: 10,
                        padding: 12,
                        minHeight: 120,
                        textAlignVertical: 'top',
                      }}
                      multiline
                      value={generatedCaption}
                      onChangeText={setGeneratedCaption}
                      autoFocus
                    />
                    <Button
                      variant="primary"
                      height={40}
                      onPress={() => setEditing(false)}
                    >
                      {t('contentEngine.saveEdit')}
                    </Button>
                  </Card>
                ) : (
                  <PostPreviewCard
                    platform={platform}
                    businessName={profile?.business_name ?? ''}
                    caption={generatedCaption}
                    bookingUrl={
                      formUrl.length > 0 && savedPostId != null
                        ? formUrl
                        : undefined
                    }
                  />
                )}

                {/* Post strength score */}
                {postStrength && (
                  <PostStrengthBadge
                    score={postStrength.score}
                    reason={postStrength.reason}
                  />
                )}

                {/* Action buttons -- shared between onboarding and regular */}
                <YStack gap="$2.5">
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
                        : t('contentEngine.copyCaption')}
                    </Button>
                    <Button
                      variant="primary"
                      onPress={handleShare}
                      flex={1}
                      icon={
                        <Ionicons name="share-outline" size={18} color="#fff" />
                      }
                    >
                      {t('contentEngine.sharePost')}
                    </Button>
                  </XStack>

                  <XStack
                    backgroundColor="$brandBackground"
                    borderRadius={10}
                    padding="$2.5"
                    alignItems="flex-start"
                    gap="$2"
                  >
                    <Ionicons name="information-circle-outline" size={16} color="#6B7280" style={{ marginTop: 1 }} />
                    <Text fontSize={12} color="$brandTextLight" lineHeight={17} flex={1}>
                      {t('contentEngine.shareTip')}
                    </Text>
                  </XStack>

                  {!editing && (
                    <Pressable onPress={() => setEditing(true)}>
                      <XStack
                        alignItems="center"
                        justifyContent="center"
                        gap="$1.5"
                        paddingVertical="$2"
                      >
                        <Ionicons name="create-outline" size={16} color="#6B7280" />
                        <Text fontSize={13} fontWeight="500" color="$brandTextLight">
                          {t('contentEngine.editCaption')}
                        </Text>
                      </XStack>
                    </Pressable>
                  )}
                </YStack>

                {!isOnboarding && (
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
