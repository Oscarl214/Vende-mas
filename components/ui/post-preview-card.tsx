import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

const PLATFORM_COLORS: Record<string, { accent: string; bg: string; text: string }> = {
  instagram: { accent: '#E1306C', bg: '#FAFAFA', text: '#262626' },
  facebook: { accent: '#1877F2', bg: '#F0F2F5', text: '#1C1E21' },
  tiktok: { accent: '#FF0050', bg: '#121212', text: '#FFFFFF' },
  google_business: { accent: '#4285F4', bg: '#FFFFFF', text: '#3C4043' },
};

const PLATFORM_ICONS: Record<string, string> = {
  facebook: 'logo-facebook',
  instagram: 'logo-instagram',
  tiktok: 'logo-tiktok',
  google_business: 'business',
};

type Props = {
  platform: string;
  businessName: string;
  caption: string;
  bookingUrl?: string;
};

export function PostPreviewCard({ platform, businessName, caption, bookingUrl }: Props) {
  const colors = PLATFORM_COLORS[platform] ?? PLATFORM_COLORS.facebook;
  const icon = PLATFORM_ICONS[platform] ?? 'globe-outline';

  return (
    <YStack
      borderRadius={16}
      overflow="hidden"
      borderWidth={1.5}
      borderColor={colors.accent}
    >
      {/* Platform header bar */}
      <XStack
        backgroundColor={colors.accent}
        paddingHorizontal="$3.5"
        paddingVertical="$2.5"
        alignItems="center"
        gap="$2"
      >
        <Ionicons name={icon as any} size={18} color="#FFFFFF" />
        <Text fontSize={13} fontWeight="600" color="#FFFFFF" flex={1}>
          {businessName}
        </Text>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.5)',
          }}
        />
      </XStack>

      {/* Post body */}
      <YStack
        backgroundColor={platform === 'tiktok' ? colors.bg : colors.bg}
        paddingHorizontal="$4"
        paddingVertical="$3.5"
        gap="$3"
      >
        <Text
          fontSize={15}
          lineHeight={23}
          color={colors.text}
          selectable
        >
          {caption}
        </Text>

        {bookingUrl ? (
          <Text fontSize={13} color={colors.accent} selectable>
            {bookingUrl}
          </Text>
        ) : null}
      </YStack>
    </YStack>
  );
}
