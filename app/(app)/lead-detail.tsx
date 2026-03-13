import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView } from 'react-native';
import { YStack, Text, XStack, TextArea } from 'tamagui';
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
import { TIERS } from '@/constants/tiers';
import { getLeads, updateLeadStatus, updateLeadRevenue, deleteLead, type Lead, type LeadStatus } from '@/lib/leads';
import { getPost, type Post } from '@/lib/posts';
import { generateFollowUp } from '@/lib/ai';
import { getEffectiveBookingUrl } from '@/lib/booking';
import { markMilestone } from '@/lib/onboarding';
import { useBrandTheme } from '@/hooks/use-brand-theme';

const PLATFORM_ICONS: Record<string, string> = {
  facebook: 'logo-facebook',
  instagram: 'logo-instagram',
  tiktok: 'logo-tiktok',
  google_business: 'business',
};

function truncateCaption(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim() + '…';
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: '#16A34A',
  contacted: '#2563EB',
  booked: '#7C3AED',
  closed: '#6B7280',
};

const STATUS_ICONS: Record<LeadStatus, string> = {
  new: 'ellipse',
  contacted: 'chatbubble-ellipses',
  booked: 'bookmark',
  closed: 'checkmark-circle',
};

function formatDate(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LeadDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user, profile } = useSession();
  const { tier } = useSubscription();
  const tierLimits = TIERS[tier];
  const brand = useBrandTheme();

  const { id: leadId } = useLocalSearchParams<{ id: string }>();

  const [lead, setLead] = useState<Lead | null>(null);
  const [sourcePost, setSourcePost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [generatingFollowUp, setGeneratingFollowUp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revenueInput, setRevenueInput] = useState('');
  const [savingRevenue, setSavingRevenue] = useState(false);
  const pendingContactPrompt = useRef(false);

  const fetchLead = useCallback(async () => {
    if (!user || !leadId) return;
    try {
      const leads = await getLeads(user.id);
      const found = leads.find((l) => l.id === leadId);
      if (found) {
        setLead(found);
        if (found.revenue != null) setRevenueInput(String(found.revenue));
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user, leadId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  useEffect(() => {
    if (!lead?.source_post_id) {
      setSourcePost(null);
      return;
    }
    let cancelled = false;
    getPost(lead.source_post_id)
      .then((post) => {
        if (!cancelled) setSourcePost(post);
      })
      .catch(() => {
        if (!cancelled) setSourcePost(null);
      });
    return () => {
      cancelled = true;
    };
  }, [lead?.source_post_id]);

  const handleStatusUpdate = async (status: LeadStatus) => {
    if (!lead) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateLeadStatus(lead.id, status);
      setLead(updated);
      if (status === 'closed') {
        markMilestone('first_booking_closed');
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveRevenue = async () => {
    if (!lead) return;
    const parsed = parseFloat(revenueInput);
    const value = isNaN(parsed) ? null : parsed;
    setSavingRevenue(true);
    try {
      const updated = await updateLeadRevenue(lead.id, value);
      setLead(updated);
      setRevenueInput(value != null ? String(value) : '');
      Alert.alert(
        t('leadDetail.revenueSaved'),
        value != null ? `$${value.toLocaleString()}` : '',
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setSavingRevenue(false);
    }
  };

  const handleGenerateFollowUp = async () => {
    if (!lead || !profile) return;
    setGeneratingFollowUp(true);
    setCopied(false);
    try {
      const cameFromSmartLink = !!lead.source_post_id || !!lead.event_date;
      const result = await generateFollowUp({
        lead: {
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          status: lead.status,
          event_date: lead.event_date,
          came_from_smart_link: cameFromSmartLink,
        },
        profile: {
          business_name: profile.business_name,
          business_type: profile.business_type,
          location: profile.location,
          services_offered: profile.services_offered,
          target_customer: profile.target_customer,
          tone: profile.tone,
          default_language: profile.default_language,
        },
        bookingUrl: user ? getEffectiveBookingUrl(profile, user.id) : null,
      });
      setFollowUpMessage(result.message);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setGeneratingFollowUp(false);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(followUpMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!lead?.phone) return;
    const phone = lead.phone.replace(/[^0-9+]/g, '');
    const encoded = encodeURIComponent(followUpMessage);
    pendingContactPrompt.current = true;
    Linking.openURL(`https://wa.me/${phone}?text=${encoded}`);
  };

  const handleSMS = () => {
    if (!lead?.phone) return;
    const encoded = encodeURIComponent(followUpMessage);
    pendingContactPrompt.current = true;
    Linking.openURL(`sms:${lead.phone}?body=${encoded}`);
  };

  const handleEmail = async () => {
    if (!lead?.email) return;
    const subject = encodeURIComponent(profile?.business_name ?? '');
    const body = encodeURIComponent(followUpMessage);
    pendingContactPrompt.current = true;
    try {
      await Linking.openURL(
        `mailto:${lead.email}?subject=${subject}&body=${body}`,
      );
    } catch {
      pendingContactPrompt.current = false;
      Alert.alert(
        t('leadDetail.emailOpenFailed'),
        t('leadDetail.emailOpenFailedMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('leadDetail.copyMessageInstead'),
            onPress: async () => {
              await Clipboard.setStringAsync(followUpMessage);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            },
          },
        ],
      );
    }
  };

  const handleCall = () => {
    if (!lead?.phone) return;
    Linking.openURL(`tel:${lead.phone}`);
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        nextState === 'active' &&
        pendingContactPrompt.current &&
        lead &&
        lead.status === 'new'
      ) {
        pendingContactPrompt.current = false;
        Alert.alert(
          t('leadDetail.markContactedTitle'),
          t('leadDetail.markContactedMessage', { name: lead.name ?? '' }),
          [
            { text: t('leadDetail.notYet'), style: 'cancel' },
            {
              text: t('leadDetail.yesMarkContacted'),
              onPress: () => handleStatusUpdate('contacted'),
            },
          ],
        );
      }
    });
    return () => subscription.remove();
  }, [lead, t]);

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text color="$brandTextLight">{t('common.saving')}...</Text>
      </YStack>
    );
  }

  if (!lead) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text color="$brandTextLight">Lead not found</Text>
      </YStack>
    );
  }

  const statuses: LeadStatus[] = ['new', 'contacted', 'booked', 'closed'];

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}
    >
      <YStack padding="$5" gap="$4">
        {/* Lead Info */}
        <Card variant="elevated" gap="$3">
          <XStack alignItems="center" gap="$3">
            <XStack
              width={48}
              height={48}
              borderRadius={24}
              backgroundColor="$brandPrimaryLight"
              justifyContent="center"
              alignItems="center"
            >
              <Text fontSize={20} fontWeight="bold" color="$brandTextInverse">
                {(lead.name ?? '?')[0].toUpperCase()}
              </Text>
            </XStack>
            <YStack flex={1}>
              <Text fontSize={18} fontWeight="bold" color="$brandSecondary">
                {lead.name ?? '—'}
              </Text>
              <XStack alignItems="center" gap="$1.5">
                <Ionicons
                  name={STATUS_ICONS[lead.status] as any}
                  size={12}
                  color={STATUS_COLORS[lead.status]}
                />
                <Text
                  fontSize={13}
                  fontWeight="500"
                  color={STATUS_COLORS[lead.status]}
                >
                  {t(`leads.status${lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}`)}
                </Text>
              </XStack>
              {lead.revenue != null && (
                <XStack alignItems="center" gap="$1">
                  <Ionicons name="cash-outline" size={13} color="#16A34A" />
                  <Text fontSize={13} fontWeight="600" color="#16A34A">
                    ${lead.revenue.toLocaleString()}
                  </Text>
                </XStack>
              )}
            </YStack>
          </XStack>

          {lead.phone && (
            <Pressable onPress={handleCall}>
              <XStack alignItems="center" gap="$2.5" paddingVertical="$1">
            <Ionicons name="call-outline" size={18} color={brand.primary} />
            <Text fontSize={15} color={brand.primary}>
                  {lead.phone}
                </Text>
              </XStack>
            </Pressable>
          )}

          {lead.email && (
            <XStack alignItems="center" gap="$2.5" paddingVertical="$1">
              <Ionicons name="mail-outline" size={18} color="#6B7280" />
              <Text fontSize={15} color="$brandText">
                {lead.email}
              </Text>
            </XStack>
          )}

          {lead.event_date && (
            <XStack alignItems="center" gap="$2.5" paddingVertical="$1">
              <Ionicons name="calendar" size={18} color="#7C3AED" />
              <Text fontSize={15} fontWeight="500" color="$brandText">
                {t('leadDetail.eventDate')}: {formatDate(lead.event_date, profile?.default_language ?? 'es')}
              </Text>
            </XStack>
          )}

          <XStack alignItems="center" gap="$2.5" paddingVertical="$1">
            <Ionicons name="calendar-outline" size={18} color="#6B7280" />
            <Text fontSize={14} color="$brandTextLight">
              {formatDate(lead.created_at, profile?.default_language ?? 'es')}
            </Text>
          </XStack>

          {sourcePost && (
            <XStack alignItems="center" gap="$2.5" paddingVertical="$1">
              <Ionicons
                name={(PLATFORM_ICONS[sourcePost.platform ?? ''] ?? 'document-text') as any}
                size={18}
                color="#6B7280"
              />
              <YStack flex={1} minWidth={0}>
                <Text fontSize={12} color="$brandTextLight">
                  {t('leadDetail.fromPost')}
                </Text>
                <Text fontSize={14} color="$brandText" numberOfLines={2}>
                  {truncateCaption(sourcePost.generated_content, 56)}
                </Text>
              </YStack>
            </XStack>
          )}
        </Card>

        {/* Status Update */}
        <YStack gap="$2">
          <Text fontSize={15} fontWeight="600" color="$brandSecondary">
            {t('leadDetail.updateStatus')}
          </Text>
          <XStack gap="$2.5">
            {statuses.map((status) => {
              const active = lead.status === status;
              return (
                <Pressable
                  key={status}
                  onPress={() => handleStatusUpdate(status)}
                  disabled={updatingStatus}
                  style={{ flex: 1 }}
                >
                  <Card
                    variant={active ? 'outlined' : 'flat'}
                    borderColor={active ? STATUS_COLORS[status] : 'transparent'}
                    borderWidth={active ? 2 : 0}
                    padding="$2.5"
                    alignItems="center"
                    gap="$1"
                  >
                    <Ionicons
                      name={STATUS_ICONS[status] as any}
                      size={20}
                      color={active ? STATUS_COLORS[status] : '#9CA3AF'}
                    />
                    <Text
                      fontSize={12}
                      fontWeight={active ? '600' : '400'}
                      color={active ? STATUS_COLORS[status] : '$brandTextLight'}
                    >
                      {t(`leads.status${status.charAt(0).toUpperCase() + status.slice(1)}`)}
                    </Text>
                  </Card>
                </Pressable>
              );
            })}
          </XStack>
        </YStack>

        {/* Revenue Section */}
        {(lead.status === 'booked' || lead.status === 'closed') && (
          <YStack gap="$2">
            <XStack alignItems="center" gap="$2">
              <Ionicons name="cash-outline" size={18} color="#16A34A" />
              <Text fontSize={15} fontWeight="600" color="$brandSecondary">
                {t('leadDetail.revenueLabel')}
              </Text>
            </XStack>
            <XStack gap="$2.5" alignItems="flex-end">
              <YStack flex={1}>
                <InputField
                  label="$"
                  placeholder={t('leadDetail.revenuePlaceholder')}
                  keyboardType="numeric"
                  value={revenueInput}
                  onChangeText={setRevenueInput}
                />
              </YStack>
              <Button
                variant="primary"
                height={52}
                onPress={handleSaveRevenue}
                disabled={savingRevenue || !revenueInput.trim()}
              >
                {savingRevenue
                  ? t('common.saving')
                  : t('leadDetail.saveRevenue')}
              </Button>
            </XStack>
          </YStack>
        )}

        {/* AI Follow-Up Section */}
        <YStack gap="$2" marginTop="$2">
          <XStack alignItems="center" gap="$2">
            <Ionicons name="sparkles" size={18} color={brand.primary} />
            <Text fontSize={15} fontWeight="600" color="$brandSecondary">
              {t('leadDetail.followUp')}
            </Text>
          </XStack>

          {!tierLimits.hasAiFollowUps ? (
            <YStack gap="$4">
              <Card variant="outlined" borderColor="$brandAccent" gap="$3" alignItems="center" padding="$4">
                <Ionicons name="lock-closed" size={28} color={brand.accent} />
                <Text fontSize={15} fontWeight="600" color="$brandSecondary" textAlign="center">
                  {t('leadDetail.proOnly')}
                </Text>
                <Text fontSize={13} color="$brandTextLight" textAlign="center" lineHeight={20}>
                  {t('leadDetail.proOnlyMessage')}
                </Text>
                <Button
                  variant="primary"
                  onPress={() => router.push('/(app)/paywall?reason=leads')}
                  height={44}
                >
                  {t('leadDetail.upgrade')}
                </Button>
              </Card>

              <YStack gap="$2">
                <Text fontSize={15} fontWeight="600" color="$brandSecondary">
                  {t('leadDetail.manualFollowUp')}
                </Text>
                <TextArea
                  value={followUpMessage}
                  onChangeText={setFollowUpMessage}
                  placeholder={t('leadDetail.manualFollowUpPlaceholder')}
                  fontSize={15}
                  color="$brandText"
                  backgroundColor="$brandBackground"
                  borderColor="$brandPrimaryLight"
                  borderWidth={1}
                  borderRadius={10}
                  padding="$3"
                  minHeight={120}
                  textAlignVertical="top"
                  blurOnSubmit
                  returnKeyType="done"
                />
                {followUpMessage.length > 0 && (
                  <Card variant="elevated" gap="$3">
                    <Pressable onPress={handleCopy}>
                      <XStack
                        alignItems="center"
                        gap="$1.5"
                        paddingVertical="$1.5"
                        paddingHorizontal="$2.5"
                        borderRadius={8}
                        backgroundColor="$brandBackground"
                        alignSelf="flex-start"
                      >
                        <Ionicons
                          name={copied ? 'checkmark-circle' : 'copy-outline'}
                          size={16}
                          color={copied ? '#16A34A' : brand.primary}
                        />
                        <Text
                          fontSize={13}
                          fontWeight="500"
                          color={copied ? '$brandSuccess' : '$brandPrimary'}
                        >
                          {copied
                            ? t('leadDetail.copied')
                            : t('leadDetail.copyMessage')}
                        </Text>
                      </XStack>
                    </Pressable>
                    <Text fontSize={13} fontWeight="600" color="$brandSecondary">
                      {t('leadDetail.sendWith')}
                    </Text>
                    <YStack gap="$2">
                      {lead.phone && (
                        <Button
                          variant="outline"
                          onPress={handleSMS}
                          height={44}
                          icon={<Ionicons name="chatbubble-outline" size={18} color="#0F766E" />}
                        >
                          SMS
                        </Button>
                      )}
                      {lead.phone && (
                        <Button
                          variant="outline"
                          onPress={handleWhatsApp}
                          height={44}
                          icon={<Ionicons name="logo-whatsapp" size={18} color="#25D366" />}
                        >
                          WhatsApp
                        </Button>
                      )}
                      {lead.email && (
                        <Button
                          variant="outline"
                          onPress={handleEmail}
                          height={44}
                          icon={<Ionicons name="mail-outline" size={18} color="#0F766E" />}
                        >
                          Email
                        </Button>
                      )}
                    </YStack>
                  </Card>
                )}
              </YStack>
            </YStack>
          ) : (
            <YStack gap="$3">
              <Button
                variant="outline"
                onPress={handleGenerateFollowUp}
                disabled={generatingFollowUp}
                icon={
                  !generatingFollowUp ? (
                    <Ionicons name="sparkles" size={18} color={brand.primary} />
                  ) : undefined
                }
              >
                {generatingFollowUp
                  ? t('leadDetail.generating')
                  : t('leadDetail.generateWithAi')}
              </Button>

              {followUpMessage.length > 0 && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <Card variant="elevated" gap="$3">
                    <Text fontSize={13} fontWeight="500" color="$brandTextLight">
                      {t('leadDetail.followUpResult')}
                    </Text>
                    <TextArea
                      value={followUpMessage}
                      onChangeText={setFollowUpMessage}
                      fontSize={15}
                      color="$brandText"
                      backgroundColor="$brandBackground"
                      borderColor="$brandPrimaryLight"
                      borderWidth={1}
                      borderRadius={10}
                      padding="$3"
                      minHeight={160}
                      textAlignVertical="top"
                      blurOnSubmit
                      returnKeyType="done"
                    />

                    <Pressable onPress={handleCopy}>
                      <XStack
                        alignItems="center"
                        gap="$1.5"
                        paddingVertical="$1.5"
                        paddingHorizontal="$2.5"
                        borderRadius={8}
                        backgroundColor="$brandBackground"
                        alignSelf="flex-start"
                      >
                        <Ionicons
                          name={copied ? 'checkmark-circle' : 'copy-outline'}
                          size={16}
                          color={copied ? '#16A34A' : brand.primary}
                        />
                        <Text
                          fontSize={13}
                          fontWeight="500"
                          color={copied ? '$brandSuccess' : '$brandPrimary'}
                        >
                          {copied
                            ? t('leadDetail.copied')
                            : t('leadDetail.copyMessage')}
                        </Text>
                      </XStack>
                    </Pressable>

                    <Text fontSize={13} fontWeight="600" color="$brandSecondary">
                      {t('leadDetail.sendWith')}
                    </Text>
                    <YStack gap="$2">
                      {lead.phone && (
                        <Button
                          variant="outline"
                          onPress={handleSMS}
                          height={44}
                          icon={<Ionicons name="chatbubble-outline" size={18} color="#0F766E" />}
                        >
                          SMS
                        </Button>
                      )}
                      {lead.phone && (
                        <Button
                          variant="outline"
                          onPress={handleWhatsApp}
                          height={44}
                          icon={<Ionicons name="logo-whatsapp" size={18} color="#25D366" />}
                        >
                          WhatsApp
                        </Button>
                      )}
                      {lead.email && (
                        <Button
                          variant="outline"
                          onPress={handleEmail}
                          height={44}
                          icon={<Ionicons name="mail-outline" size={18} color="#0F766E" />}
                        >
                          Email
                        </Button>
                      )}
                    </YStack>
                  </Card>
                </Animated.View>
              )}
            </YStack>
          )}
        </YStack>

        {/* Delete lead */}
        <YStack marginTop="$4" paddingTop="$4" borderTopWidth={1} borderColor="$brandBorder">
          <Button
            variant="outline"
            onPress={() => {
              Alert.alert(
                t('leads.confirmDeleteTitle'),
                t('leads.confirmDeleteMessage', { name: lead.name ?? t('leads.thisLead') }),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('leadDetail.deleteLead'),
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteLead(lead.id);
                        router.back();
                      } catch (error: any) {
                        Alert.alert(t('common.error'), error.message);
                      }
                    },
                  },
                ],
              );
            }}
            icon={<Ionicons name="trash-outline" size={18} color="#B91C1C" />}
          >
            {t('leadDetail.deleteLead')}
          </Button>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
