import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  Share,
  Platform as RNPlatform,
} from 'react-native';
import { YStack, Text, XStack, Sheet } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { useSession } from '@/hooks/use-session';
import { useSubscription } from '@/hooks/use-subscription';
import { TIERS } from '@/constants/tiers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import {
  getLeads,
  createLead,
  leadNeedsFollowUp,
  daysSince,
  type Lead,
  type LeadStatus,
} from '@/lib/leads';
import { getPosts, type Post } from '@/lib/posts';
import { getEffectiveBookingUrl } from '@/lib/booking';
import { markMilestone } from '@/lib/onboarding';

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

type FilterKey = 'all' | LeadStatus | 'needsFollowUp';

function timeAgo(
  dateStr: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('leads.timeAgo.now');
  if (diffMin < 60) return t('leads.timeAgo.minutes', { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t('leads.timeAgo.hours', { count: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  return t('leads.timeAgo.days', { count: diffDay });
}

export default function LeadsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, profile } = useSession();
  const { tier, usage, canStoreLead, refreshUsage } = useSubscription();
  const limits = TIERS[tier];
  const atLimit = !canStoreLead;
  const proPrice = t('tiers.proPrice');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [addingLead, setAddingLead] = useState(false);

  const formUrl = user
    ? getEffectiveBookingUrl(profile ?? null, user.id)
    : '';

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    try {
      const [leadsData, postsData] = await Promise.all([
        getLeads(user.id),
        getPosts(user.id),
      ]);
      setLeads(leadsData);
      setPosts(postsData);
      if (leadsData.length > 0) {
        markMilestone('first_lead');
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  const postsById = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);

  useFocusEffect(
    useCallback(() => {
      fetchLeads();
      refreshUsage();
    }, [fetchLeads, refreshUsage]),
  );

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newLead = payload.new as Lead;
          setLeads((prev) => [newLead, ...prev]);
          refreshUsage();
          markMilestone('first_lead');
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Lead;
          setLeads((prev) =>
            prev.map((l) => (l.id === updated.id ? updated : l)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshUsage]);

  const leadsNeedingFollowUp = useMemo(
    () => leads.filter(leadNeedsFollowUp),
    [leads],
  );
  /** Set to true to show follow-up UI regardless of tier (for testing). */
  const DEBUG_SHOW_FOLLOW_UP_UI = false;
  const showFollowUpReminders =
    (tier === 'pro' || DEBUG_SHOW_FOLLOW_UP_UI) && leadsNeedingFollowUp.length > 0;

  const filteredLeads = useMemo(() => {
    if (filter === 'needsFollowUp') return leadsNeedingFollowUp;
    if (filter === 'all') return leads;
    return leads.filter((l) => l.status === filter);
  }, [leads, filter, leadsNeedingFollowUp]);

  const handleShareForm = async () => {
    if (!formUrl) return;
    try {
      if (RNPlatform.OS === 'web') {
        await Clipboard.setStringAsync(formUrl);
        Alert.alert(t('leads.formLinkCopied'));
      } else {
        await Share.share({
          message: `${t('leads.shareFormMessage')}\n${formUrl}`,
          title: t('leads.shareFormTitle'),
        });
      }
    } catch {
      // cancelled
    }
  };

  const handleAddLead = async () => {
    if (!user) return;
    if (!newName.trim() || !newPhone.trim()) return;
    setAddingLead(true);
    try {
      await createLead(user.id, {
        name: newName.trim(),
        phone: newPhone.trim(),
      });
      setNewName('');
      setNewPhone('');
      setAddSheetOpen(false);
      await refreshUsage();
      await fetchLeads();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setAddingLead(false);
    }
  };

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: t('leads.filterAll') },
    ...(showFollowUpReminders
      ? [{ key: 'needsFollowUp' as const, label: t('leads.filterNeedsFollowUp') }]
      : []),
    { key: 'new', label: t('leads.filterNew') },
    { key: 'contacted', label: t('leads.filterContacted') },
    { key: 'booked', label: t('leads.filterBooked') },
    { key: 'closed', label: t('leads.filterClosed') },
  ];

  const renderLead = ({ item }: { item: Lead }) => {
    const needsFollowUp = showFollowUpReminders && leadNeedsFollowUp(item);
    const reminderNew = item.status === 'new';
    const days = item.last_contacted_at ? daysSince(item.last_contacted_at) : 0;
    const displayName = item.name ?? '—';
    const sourcePost = item.source_post_id ? postsById.get(item.source_post_id) : null;

    return (
      <Pressable
        onPress={() => router.push(`/(app)/lead-detail?id=${item.id}`)}
      >
        <Card variant="elevated" padding="$3.5" marginBottom="$2.5">
          <XStack alignItems="center" gap="$3">
            <XStack
              width={40}
              height={40}
              borderRadius={20}
              backgroundColor={STATUS_COLORS[item.status] + '18'}
              justifyContent="center"
              alignItems="center"
            >
              <Text
                fontSize={16}
                fontWeight="bold"
                color={STATUS_COLORS[item.status]}
              >
                {(item.name ?? '?')[0].toUpperCase()}
              </Text>
            </XStack>
            <YStack flex={1} gap="$0.5">
              <Text fontSize={15} fontWeight="600" color="$brandSecondary">
                {item.name ?? '—'}
              </Text>
              {item.phone && (
                <Text fontSize={13} color="$brandTextLight">
                  {item.phone}
                </Text>
              )}
            </YStack>
            <YStack alignItems="flex-end" gap="$1">
              <XStack
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius={6}
                backgroundColor={STATUS_COLORS[item.status] + '18'}
              >
                <Text
                  fontSize={11}
                  fontWeight="600"
                  color={STATUS_COLORS[item.status]}
                >
                  {t(`leads.status${item.status.charAt(0).toUpperCase() + item.status.slice(1)}`)}
                </Text>
              </XStack>
              <Text fontSize={11} color="$brandTextLight">
                {timeAgo(item.created_at, t)}
              </Text>
            </YStack>
          </XStack>
          {sourcePost && (
            <XStack marginTop="$2" alignItems="center" gap="$1.5" flexWrap="wrap">
              <Ionicons
                name={(PLATFORM_ICONS[sourcePost.platform ?? ''] ?? 'document-text') as any}
                size={14}
                color="#6B7280"
              />
              <Text fontSize={12} color="$brandTextLight" numberOfLines={1} flex={1} minWidth={0}>
                {t('leads.fromPost')}: {truncateCaption(sourcePost.generated_content, 38)}
              </Text>
            </XStack>
          )}
          {needsFollowUp && (
            <YStack marginTop="$3" paddingTop="$2.5" borderTopWidth={1} borderColor="$brandBorder" gap="$2">
              <XStack alignItems="center" gap="$1.5">
                <Ionicons name="notifications-outline" size={16} color="#B45309" />
                <Text fontSize={13} color="$brandTextLight" flex={1}>
                  {reminderNew
                    ? t('leads.reminderNew', { name: displayName })
                    : t('leads.reminderContacted', { name: displayName, days })}
                </Text>
              </XStack>
              <Button
                variant="outline"
                height={40}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  router.push(`/(app)/lead-detail?id=${item.id}`);
                }}
                icon={<Ionicons name="sparkles" size={14} color="#0F766E" />}
              >
                {t('leads.generateFollowUp')}
              </Button>
            </YStack>
          )}
        </Card>
      </Pressable>
    );
  };

  return (
    <YStack flex={1} padding="$4" gap="$3">
      {/* Pro: follow-up reminder banner */}
      {showFollowUpReminders && (
        <Pressable onPress={() => setFilter('needsFollowUp')}>
          <Card variant="outlined" borderColor="#EAB308" padding="$2.5" backgroundColor="#FEF9C3">
            <XStack alignItems="center" gap="$2">
              <Ionicons name="notifications" size={20} color="#B45309" />
              <Text fontSize={14} fontWeight="500" color="$brandSecondary" flex={1}>
                {t('leads.followUpReminderBanner', { count: leadsNeedingFollowUp.length })}
              </Text>
            </XStack>
          </Card>
        </Pressable>
      )}

      {/* Header: count + share + add */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={14} color="$brandTextLight">
          {t('leads.leadCount', { count: leads.length })}
        </Text>
        <XStack gap="$2">
          <Pressable onPress={handleShareForm}>
            <XStack
              alignItems="center"
              gap="$1.5"
              paddingHorizontal="$2.5"
              paddingVertical="$1.5"
              borderRadius={8}
              backgroundColor="$brandPrimary"
            >
              <Ionicons name="share-outline" size={16} color="#fff" />
              <Text fontSize={13} fontWeight="500" color="$brandTextInverse">
                {t('leads.shareFormLink')}
              </Text>
            </XStack>
          </Pressable>
          <Pressable
            onPress={() => {
              if (atLimit) {
                router.push('/(app)/paywall?reason=leads');
              } else {
                setAddSheetOpen(true);
              }
            }}
          >
            <XStack
              width={34}
              height={34}
              borderRadius={17}
              backgroundColor="$brandAccent"
              justifyContent="center"
              alignItems="center"
            >
              <Ionicons name="add" size={20} color="#fff" />
            </XStack>
          </Pressable>
        </XStack>
      </XStack>

      {/* Usage bar for free tier */}
      {tier === 'free' && (
        <Card variant="flat" padding="$2.5">
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap="$2">
              <Ionicons name="people" size={16} color="#6B7280" />
              <Text fontSize={13} color="$brandTextLight">
                {t('leads.stored')}
              </Text>
            </XStack>
            <Text
              fontSize={13}
              fontWeight="600"
              color={atLimit ? '$brandError' : '$brandText'}
            >
              {usage.leadsStored}/{limits.maxLeads}
            </Text>
          </XStack>
        </Card>
      )}

      {/* Limit banner */}
      {atLimit && (
        <Card variant="outlined" borderColor="$brandAccent" gap="$2" alignItems="center" padding="$3">
          <Ionicons name="lock-closed" size={24} color="#F97316" />
          <Text fontSize={14} fontWeight="600" color="$brandSecondary" textAlign="center">
            {t('leads.limitReached')}
          </Text>
          <Text fontSize={13} color="$brandTextLight" textAlign="center" lineHeight={18}>
            {t('leads.limitMessage', { max: limits.maxLeads, price: proPrice })}
          </Text>
          <Button
            variant="primary"
            height={40}
            onPress={() => router.push('/(app)/paywall?reason=leads')}
          >
            {t('leads.viewPlans')}
          </Button>
        </Card>
      )}

      {/* Filters */}
      <XStack gap="$2">
        {filters.map(({ key, label }) => {
          const active = filter === key;
          return (
            <Pressable key={key} onPress={() => setFilter(key)}>
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

      {/* Lead list */}
      {leads.length === 0 && !loading ? (
        <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
          <Ionicons name="people-outline" size={64} color="#D1D5DB" />
          <Text
            fontSize={20}
            fontWeight="600"
            color="$brandSecondary"
            textAlign="center"
          >
            {t('leads.emptyTitle')}
          </Text>
          <Text
            fontSize={15}
            color="$brandTextLight"
            textAlign="center"
            lineHeight={22}
          >
            {t('leads.emptyMessage')}
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.id}
          renderItem={renderLead}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* Add Lead Sheet */}
      <Sheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        modal
        dismissOnSnapToBottom
        snapPointsMode="fit"
      >
        <Sheet.Frame padding="$4" gap="$3">
          <Text fontSize={18} fontWeight="bold" color="$brandSecondary">
            {t('leads.addLeadTitle')}
          </Text>
          <InputField
            label={t('leads.nameLabel')}
            placeholder={t('leads.namePlaceholder')}
            value={newName}
            onChangeText={setNewName}
          />
          <InputField
            label={t('leads.phoneLabel')}
            placeholder={t('leads.phonePlaceholder')}
            keyboardType="phone-pad"
            value={newPhone}
            onChangeText={setNewPhone}
          />
          <XStack gap="$3" marginTop="$2">
            <Button
              variant="outline"
              flex={1}
              onPress={() => {
                setAddSheetOpen(false);
                setNewName('');
                setNewPhone('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              flex={1}
              onPress={handleAddLead}
              disabled={addingLead || !newName.trim() || !newPhone.trim()}
              opacity={addingLead ? 0.7 : 1}
            >
              {addingLead ? t('common.saving') : t('common.save')}
            </Button>
          </XStack>
        </Sheet.Frame>
        <Sheet.Overlay />
      </Sheet>
    </YStack>
  );
}
