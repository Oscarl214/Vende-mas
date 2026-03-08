import { useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, ViewToken } from 'react-native';
import { YStack, Text, XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  subtitleKey: string;
  color: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'sparkles',
    titleKey: 'onboarding.slide1Title',
    subtitleKey: 'onboarding.slide1Subtitle',
    color: '#0F766E',
  },
  {
    icon: 'people',
    titleKey: 'onboarding.slide2Title',
    subtitleKey: 'onboarding.slide2Subtitle',
    color: '#F97316',
  },
  {
    icon: 'trending-up',
    titleKey: 'onboarding.slide3Title',
    subtitleKey: 'onboarding.slide3Subtitle',
    color: '#2563EB',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile } = useSession();
  const [phase, setPhase] = useState<'ready' | 'slides'>('ready');
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleCreateFirstPost = () => {
    router.replace('/(app)/generate-post?onboarding=true');
  };

  if (phase === 'ready') {
    return (
      <Animated.View
        entering={FadeIn.duration(400)}
        style={{ flex: 1 }}
      >
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          padding="$6"
          paddingTop={insets.top}
          paddingBottom={insets.bottom + 20}
          backgroundColor="$background"
          gap="$5"
        >
          <XStack
            width={100}
            height={100}
            borderRadius={50}
            backgroundColor="$brandPrimary"
            justifyContent="center"
            alignItems="center"
          >
            <Ionicons name="sparkles" size={48} color="#fff" />
          </XStack>

          <YStack alignItems="center" gap="$2">
            <Text
              fontSize={26}
              fontWeight="bold"
              color="$brandSecondary"
              textAlign="center"
            >
              {t('onboarding.engineReady')}
            </Text>
            <Text fontSize={16} color="$brandTextLight" textAlign="center">
              {profile?.business_name}
            </Text>
          </YStack>

          <Button
            variant="primary"
            width="100%"
            marginTop="$4"
            onPress={() => setPhase('slides')}
          >
            {t('onboarding.continue')}
          </Button>
        </YStack>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={{ flex: 1 }}
    >
      <YStack
        flex={1}
        paddingTop={insets.top}
        paddingBottom={insets.bottom + 20}
        backgroundColor="$background"
      >
        <YStack flex={1} justifyContent="center">
          <FlatList
            ref={flatListRef}
            data={SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <YStack
                width={SCREEN_WIDTH}
                justifyContent="center"
                alignItems="center"
                padding="$6"
                gap="$5"
              >
                <Animated.View
                  key={`icon-${activeIndex}-${index}`}
                  entering={ZoomIn.duration(300)}
                >
                  <XStack
                    width={88}
                    height={88}
                    borderRadius={44}
                    backgroundColor={item.color}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Ionicons name={item.icon} size={40} color="#fff" />
                  </XStack>
                </Animated.View>

                <YStack alignItems="center" gap="$2" maxWidth={300}>
                  <Animated.View
                    key={`title-${activeIndex}-${index}`}
                    entering={FadeInDown.delay(150).duration(300)}
                  >
                    <Text
                      fontSize={24}
                      fontWeight="bold"
                      color="$brandSecondary"
                      textAlign="center"
                    >
                      {t(item.titleKey)}
                    </Text>
                  </Animated.View>
                  <Animated.View
                    key={`subtitle-${activeIndex}-${index}`}
                    entering={FadeInDown.delay(300).duration(300)}
                  >
                    <Text
                      fontSize={16}
                      color="$brandTextLight"
                      textAlign="center"
                      lineHeight={24}
                    >
                      {t(item.subtitleKey)}
                    </Text>
                  </Animated.View>
                </YStack>
              </YStack>
            )}
          />

          {/* Dot indicators */}
          <XStack justifyContent="center" gap="$2" marginTop="$4">
            {SLIDES.map((_, i) => (
              <Pressable
                key={i}
                onPress={() =>
                  flatListRef.current?.scrollToIndex({ index: i, animated: true })
                }
              >
                <XStack
                  width={i === activeIndex ? 24 : 8}
                  height={8}
                  borderRadius={4}
                  backgroundColor={
                    i === activeIndex ? '$brandPrimary' : '$brandBorder'
                  }
                />
              </Pressable>
            ))}
          </XStack>
        </YStack>

        <YStack paddingHorizontal="$5" paddingTop="$4" minHeight={60}>
          {activeIndex === SLIDES.length - 1 && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Button
                variant="primary"
                onPress={handleCreateFirstPost}
                icon={<Ionicons name="sparkles" size={20} color="#fff" />}
              >
                {t('onboarding.createFirstPost')}
              </Button>
            </Animated.View>
          )}
        </YStack>
      </YStack>
    </Animated.View>
  );
}
