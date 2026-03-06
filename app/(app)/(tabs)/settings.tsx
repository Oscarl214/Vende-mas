import { useState } from 'react';
import { Alert, Modal, Pressable } from 'react-native';
import { YStack, Text, XStack, Separator } from 'tamagui';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { useSubscription } from '@/hooks/use-subscription';
import { useNotifications } from '@/hooks/use-notifications';
import { useLanguage } from '@/providers/language-provider';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { profile, user, signOut } = useSession();
  const { tier } = useSubscription();
  const { language, changeLanguage } = useLanguage();
  const { notificationsEnabled, toggleNotifications } = useNotifications();
  const [langPickerOpen, setLangPickerOpen] = useState(false);

  const tierLabel = t(`tiers.${tier}`);

  const handleSignOut = () => {
    Alert.alert(
      t('settings.signOutConfirm.title'),
      t('settings.signOutConfirm.message'),
      [
        { text: t('settings.signOutConfirm.cancel'), style: 'cancel' },
        { text: t('settings.signOutConfirm.confirm'), style: 'destructive', onPress: signOut },
      ],
    );
  };

  const handleLanguageChange = async (lang: string) => {
    await changeLanguage(lang);
    setLangPickerOpen(false);
  };

  return (
    <YStack flex={1} padding="$5" gap="$4">
      <Card variant="elevated" gap="$3">
        <XStack gap="$4" alignItems="center">
          {profile?.logo_url ? (
            <Image
              source={{ uri: profile.logo_url }}
              style={{ width: 60, height: 60, borderRadius: 30 }}
            />
          ) : (
            <XStack
              width={60}
              height={60}
              borderRadius={30}
              backgroundColor="$brandPrimary"
              justifyContent="center"
              alignItems="center"
            >
              <Text fontSize={24} fontWeight="bold" color="$brandTextInverse">
                {profile?.business_name?.[0]?.toUpperCase() ?? 'V'}
              </Text>
            </XStack>
          )}
          <YStack flex={1}>
            <Text fontSize={18} fontWeight="bold" color="$brandSecondary">
              {profile?.business_name ?? t('dashboard.yourBusiness')}
            </Text>
            <Text fontSize={14} color="$brandTextLight">
              {profile?.business_type ?? ''}
            </Text>
            <Text fontSize={12} color="$brandTextLight">
              {user?.email ?? ''}
            </Text>
          </YStack>
        </XStack>
      </Card>

      <Card variant="outlined" padding="$0">
        <SettingsRow
          icon="business-outline"
          label={t('settings.editBusiness')}
          onPress={() => router.push('/(app)/profile-setup?editing=true')}
        />
        <Separator />
        <SettingsRow
          icon="card-outline"
          label={t('settings.subscription')}
          badge={tierLabel}
          badgeColor={tier === 'pro' ? '#F97316' : '#6B7280'}
          onPress={() =>
            router.push(tier === 'pro' ? '/(app)/subscription' : '/(app)/paywall')
          }
        />
        <Separator />
        <SettingsRow
          icon="notifications-outline"
          label={t('settings.notifications')}
          value={notificationsEnabled ? t('settings.notificationsEnabled') : t('settings.notificationsDisabled')}
          onPress={toggleNotifications}
        />
        <Separator />
        <SettingsRow
          icon="language-outline"
          label={t('settings.language')}
          value={LANGUAGES.find((l) => l.code === language)?.label}
          onPress={() => setLangPickerOpen(true)}
        />
      </Card>

      <Button variant="outline" onPress={handleSignOut} marginTop="$4">
        {t('settings.signOut')}
      </Button>

      <Text fontSize={12} color="$brandTextLight" textAlign="center" marginTop="$2">
        {t('settings.version')}
      </Text>

      <Modal
        visible={langPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLangPickerOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setLangPickerOpen(false)}
        >
          <Pressable
            style={{ width: '80%', maxWidth: 320, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}
            onPress={(e) => e.stopPropagation()}
          >
            <YStack padding="$4" gap="$1">
              <Text fontSize={18} fontWeight="bold" color="$brandSecondary" marginBottom="$2">
                {t('settings.languagePicker.title')}
              </Text>
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => handleLanguageChange(lang.code)}
                  style={{ paddingVertical: 12, paddingHorizontal: 4 }}
                >
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize={16} color="$brandText">
                      {lang.label}
                    </Text>
                    {language === lang.code && (
                      <Ionicons name="checkmark-circle" size={22} color="#0F766E" />
                    )}
                  </XStack>
                </Pressable>
              ))}
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>
    </YStack>
  );
}

function SettingsRow({
  icon,
  label,
  badge,
  badgeColor,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: string;
  badgeColor?: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <XStack
      paddingHorizontal="$4"
      paddingVertical="$3.5"
      justifyContent="space-between"
      alignItems="center"
      pressStyle={{ backgroundColor: '$brandBackground' }}
      onPress={onPress}
    >
      <XStack gap="$3" alignItems="center">
        <Ionicons name={icon} size={22} color="#6B7280" />
        <Text fontSize={16} color="$brandText">
          {label}
        </Text>
        {badge && (
          <XStack
            paddingHorizontal={8}
            paddingVertical={2}
            borderRadius={6}
            backgroundColor={badgeColor ?? '#6B7280'}
          >
            <Text fontSize={11} fontWeight="bold" color="$brandTextInverse">
              {badge.toUpperCase()}
            </Text>
          </XStack>
        )}
      </XStack>
      <XStack alignItems="center" gap="$2">
        {value && (
          <Text fontSize={14} color="$brandTextLight">
            {value}
          </Text>
        )}
        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
      </XStack>
    </XStack>
  );
}
