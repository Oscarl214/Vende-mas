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
import { getLeads, updateLeadStatus, updateLeadRevenue, deleteLead, logLeadMessage, getLeadMessages, leadNeedsFollowUp, daysSince, type Lead, type LeadStatus, type LeadMessage } from '@/lib/leads';
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

function timeAgo(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (lang === 'es') {
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days === 1) return 'Ayer';
    return `Hace ${days} días`;
  }
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

const CHANNEL_META: Record<LeadMessage['channel'], { icon: string; color: string; label: string }> = {
  sms: { icon: 'chatbubble-outline', color: '#0F766E', label: 'SMS' },
  whatsapp: { icon: 'logo-whatsapp', color: '#25D366', label: 'WhatsApp' },
  email: { icon: 'mail-outline', color: '#2563EB', label: 'Email' },
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
  const [messages, setMessages] = useState<LeadMessage[]>([]);
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

  const fetchMessages = useCallback(async () => {
    if (!leadId) return;
    try {
      const msgs = await getLeadMessages(leadId);
      setMessages(msgs);
    } catch {
      // silently fail
    }
  }, [leadId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

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

  const logAndRefresh = async (channel: LeadMessage['channel']) => {
    if (!lead || !user || !followUpMessage.trim()) return;
    try {
      await logLeadMessage(lead.id, user.id, followUpMessage, channel);
      const now = new Date().toISOString();
      setLead((prev) => prev ? { ...prev, last_contacted_at: now } : prev);
      await fetchMessages();
    } catch {
      // silently fail — don't block the user
    }
  };

  const handleWhatsApp = () => {
    if (!lead?.phone) return;
    const phone = lead.phone.replace(/[^0-9+]/g, '');
    const encoded = encodeURIComponent(followUpMessage);
    pendingContactPrompt.current = true;
    Linking.openURL(`https://wa.me/${phone}?text=${encoded}`);
    logAndRefresh('whatsapp');
  };

  const handleSMS = () => {
    if (!lead?.phone) return;
    const encoded = encodeURIComponent(followUpMessage);
    pendingContactPrompt.current = true;
    Linking.openURL(`sms:${lead.phone}?body=${encoded}`);
    logAndRefresh('sms');
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
      logAndRefresh('email');
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
              {leadNeedsFollowUp(lead) ? (
                <XStack
                  alignItems="center"
                  gap="$1"
                  backgroundColor="#FEF3C7"
                  borderRadius={6}
                  paddingHorizontal="$1.5"
                  paddingVertical={2}
                  alignSelf="flex-start"
                >
                  <Ionicons name="alert-circle-outline" size={12} color="#D97706" />
                  <Text fontSize={11} fontWeight="600" color="#D97706">
                    {t('leadDetail.needsFollowUp')}
                  </Text>
                </XStack>
              ) : lead.last_contacted_at ? (
                <XStack alignItems="center" gap="$1">
                  <Ionicons name="checkmark-circle-outline" size={12} color="#6B7280" />
                  <Text fontSize={12} color="$brandTextLight">
                    {t('leadDetail.lastContacted', { time: timeAgo(lead.last_contacted_at, profile?.default_language ?? 'en') })}
                  </Text>
                </XStack>
              ) : null}
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
            <YStack
              borderLeftWidth={3}
              borderLeftColor="$brandPrimary"
              paddingLeft="$3"
              paddingVertical="$2"
              gap="$1"
              backgroundColor="$brandBackground"
              borderRadius={8}
              marginTop="$1"
            >
              <XStack alignItems="center" gap="$1.5">
                <Ionicons
                  name={(PLATFORM_ICONS[sourcePost.platform ?? ''] ?? 'document-text') as any}
                  size={13}
                  color={brand.primary}
                />
                <Text fontSize={11} fontWeight="700" color="$brandPrimary" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t('leadDetail.fromPost')}
                </Text>
                {sourcePost.click_count > 0 && (
                  <XStack
                    marginLeft="auto"
                    alignItems="center"
                    gap="$1"
                    backgroundColor="$brandPrimaryLight"
                    borderRadius={6}
                    paddingHorizontal="$1.5"
                    paddingVertical={1}
                  >
                    <Ionicons name="cursor-outline" size={11} color={brand.primary} />
                    <Text fontSize={11} fontWeight="600" color="$brandPrimary">
                      {sourcePost.click_count}
                    </Text>
                  </XStack>
                )}
              </XStack>
              <Text fontSize={13} color="$brandText" lineHeight={18} numberOfLines={3}>
                {truncateCaption(sourcePost.generated_content, 120)}
              </Text>
            </YStack>
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

        {/* Message History */}
        <YStack gap="$3" marginTop="$2">
          <XStack alignItems="center" gap="$2">
            <Ionicons name="chatbubbles-outline" size={18} color={brand.primary} />
            <Text fontSize={15} fontWeight="600" color="$brandSecondary">
              {t('leadDetail.messageHistory')}
            </Text>
            {messages.length > 0 && (
              <XStack
                backgroundColor="$brandPrimaryLight"
                borderRadius={10}
                paddingHorizontal="$1.5"
                paddingVertical={1}
                minWidth={20}
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={11} fontWeight="700" color="$brandTextInverse">
                  {messages.length}
                </Text>
              </XStack>
            )}
          </XStack>

          <Card variant="elevated" gap="$0">
            {messages.length === 0 ? (
              <XStack alignItems="center" gap="$2" padding="$4" justifyContent="center">
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#9CA3AF" />
                <Text fontSize={14} color="$brandTextLight">
                  {t('leadDetail.noMessages')}
                </Text>
              </XStack>
            ) : (
              messages.map((msg, index) => {
                const meta = CHANNEL_META[msg.channel];
                const lang = profile?.default_language ?? 'en';
                return (
                  <YStack
                    key={msg.id}
                    paddingVertical="$3"
                    paddingHorizontal="$3.5"
                    borderBottomWidth={index < messages.length - 1 ? 1 : 0}
                    borderColor="$brandBorder"
                  >
                    <XStack alignItems="flex-start" gap="$2.5">
                      <XStack
                        width={32}
                        height={32}
                        borderRadius={16}
                        backgroundColor="$brandBackground"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                      >
                        <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                      </XStack>
                      <YStack flex={1} gap="$0.5">
                        <XStack justifyContent="space-between" alignItems="center">
                          <Text fontSize={12} fontWeight="600" color={meta.color}>
                            {meta.label}
                          </Text>
                          <Text fontSize={11} color="$brandTextLight">
                            {timeAgo(msg.sent_at, lang)}
                          </Text>
                        </XStack>
                        <Text fontSize={14} color="$brandText" lineHeight={20} numberOfLines={4}>
                          {msg.message}
                        </Text>
                      </YStack>
                    </XStack>
                  </YStack>
                );
              })
            )}
          </Card>
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
