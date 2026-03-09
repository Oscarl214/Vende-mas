import { useEffect } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

function scoreColor(score: number): string {
  if (score >= 8) return '#16A34A';
  if (score >= 5) return '#F59E0B';
  return '#EF4444';
}

type Props = {
  score: number;
  reason: string;
};

export function PostStrengthBadge({ score, reason }: Props) {
  const { t } = useTranslation();
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(score / 10, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [score]);

  const color = scoreColor(score);

  const barStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
    height: '100%',
    backgroundColor: color,
    borderRadius: 4,
  }));

  return (
    <YStack
      backgroundColor="$background"
      borderRadius={12}
      padding="$3.5"
      borderWidth={1}
      borderColor="$brandBorder"
      gap="$2.5"
    >
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap="$2">
          <Ionicons name="analytics-outline" size={18} color={color} />
          <Text fontSize={14} fontWeight="600" color="$brandText">
            {t('contentEngine.postStrength')}
          </Text>
        </XStack>
        <XStack alignItems="baseline" gap="$1">
          <Text fontSize={20} fontWeight="700" color={color}>
            {score.toFixed(1)}
          </Text>
          <Text fontSize={13} color="$brandTextLight">
            {t('contentEngine.postStrengthOf')}
          </Text>
        </XStack>
      </XStack>

      {/* Animated bar */}
      <YStack
        height={6}
        borderRadius={4}
        backgroundColor="$brandBackground"
        overflow="hidden"
      >
        <Animated.View style={barStyle} />
      </YStack>

      <Text fontSize={13} color="$brandTextLight" lineHeight={18}>
        {reason}
      </Text>
    </YStack>
  );
}
