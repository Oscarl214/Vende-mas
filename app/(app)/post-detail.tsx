import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import { YStack, Text, XStack } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { getPost, archivePost, unarchivePost, type Post } from '@/lib/posts';
import { getLeadsByPost, type Lead, type LeadStatus } from '@/lib/leads';
import { getEffectiveBookingUrl } from '@/lib/booking';

const PLATFORM_ICONS: Record<string, string> = {
  facebook: 'logo-facebook',
  instagram: 'logo-instagram',
  tiktok: 'logo-tiktok',
  google_business: 'business',
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: '#16A34A',
  contacted: '#2563EB',
  booked: '#7C3AED',
  closed: '#6B7280',
};

function formatDate(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

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

export default function PostDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user, profile } = useSession();
  const { id: postId } = useLocalSearchParams<{ id: string }>();

  const [post, setPost] = useState<Post | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const lang = profile?.default_language ?? 'es';

  const fetchData = useCallback(async () => {
    if (!postId) return;
    try {
      const [postData, leadsData] = await Promise.all([
        getPost(postId),
        getLeadsByPost(postId),
      ]);
      setPost(postData);
      setLeads(leadsData);
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const trackingLink =
    post && user && profile
      ? getEffectiveBookingUrl(profile, user.id, post.id)
      : '';

  const setCopiedFor = (field: string) => {
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyPost = async () => {
    if (!post) return;
    await Clipboard.setStringAsync(post.generated_content);
    setCopiedFor('post');
  };

  const handleCopyWithLink = async () => {
    if (!post) return;
    const text = trackingLink
      ? `${post.generated_content}\n\n${trackingLink}`
      : post.generated_content;
    await Clipboard.setStringAsync(text);
    setCopiedFor('withLink');
  };

  const handleCopyLink = async () => {
    if (!trackingLink) return;
    await Clipboard.setStringAsync(trackingLink);
    setCopiedFor('link');
  };

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text color="$brandTextLight">{t('posts.loading')}</Text>
      </YStack>
    );
  }

  if (!post) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text color="$brandTextLight">Post not found</Text>
      </YStack>
    );
  }

  const platform = post.platform ?? 'instagram';
  const iconName = PLATFORM_ICONS[platform] ?? 'document-text';
  const clicks = post.click_count ?? 0;
  const totalRevenue = leads.reduce(
    (sum, l) => sum + (l.revenue ?? 0),
    0,
  );

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}
    >
      <YStack padding="$5" gap="$4">
        {/* Platform & date header */}
        <XStack alignItems="center" gap="$2">
          <Ionicons name={iconName as any} size={20} color="#6B7280" />
          <Text fontSize={14} color="$brandTextLight" textTransform="capitalize">
            {platform.replace('_', ' ')}
          </Text>
          <Text fontSize={14} color="$brandTextLight">
            ·
          </Text>
          <Text fontSize={14} color="$brandTextLight">
            {formatDate(post.created_at, lang)}
          </Text>
        </XStack>

        {/* Full post content */}
        <YStack gap="$2">
          <Text fontSize={15} fontWeight="600" color="$brandSecondary">
            {t('postDetail.fullPost')}
          </Text>
          <Card variant="elevated" padding="$4">
            <Text
              fontSize={14}
              color="$brandText"
              lineHeight={22}
              selectable
            >
              {post.generated_content}
            </Text>
          </Card>
        </YStack>

        {/* Copy buttons */}
        <XStack gap="$3">
          <Button
            variant="outline"
            flex={1}
            onPress={handleCopyPost}
            icon={
              <Ionicons
                name={copiedField === 'post' ? 'checkmark-circle' : 'copy-outline'}
                size={18}
                color={copiedField === 'post' ? '#16A34A' : '#0F766E'}
              />
            }
          >
            {copiedField === 'post'
              ? t('postDetail.copied')
              : t('postDetail.copyPost')}
          </Button>
          <Button
            variant="primary"
            flex={1}
            onPress={handleCopyWithLink}
            icon={
              <Ionicons
                name={copiedField === 'withLink' ? 'checkmark-circle' : 'link-outline'}
                size={18}
                color="#fff"
              />
            }
          >
            {copiedField === 'withLink'
              ? t('postDetail.copied')
              : t('postDetail.copyWithLink')}
          </Button>
        </XStack>

        {/* Performance metrics */}
        <YStack gap="$2">
          <Text fontSize={15} fontWeight="600" color="$brandSecondary">
            {t('postDetail.performance')}
          </Text>
          <XStack gap="$3">
            <Card variant="flat" flex={1} padding="$3" alignItems="center" gap="$1">
              <Ionicons name="hand-left-outline" size={22} color="#0F766E" />
              <Text fontSize={22} fontWeight="bold" color="$brandSecondary">
                {clicks}
              </Text>
              <Text fontSize={13} color="$brandTextLight">
                {t('postDetail.clicks')}
              </Text>
            </Card>
            <Card variant="flat" flex={1} padding="$3" alignItems="center" gap="$1">
              <Ionicons name="people-outline" size={22} color="#0F766E" />
              <Text fontSize={22} fontWeight="bold" color="$brandSecondary">
                {leads.length}
              </Text>
              <Text fontSize={13} color="$brandTextLight">
                {t('postDetail.leads')}
              </Text>
            </Card>
            <Card variant="flat" flex={1} padding="$3" alignItems="center" gap="$1">
              <Ionicons name="cash-outline" size={22} color="#16A34A" />
              <Text fontSize={22} fontWeight="bold" color="$brandSecondary">
                ${totalRevenue.toLocaleString()}
              </Text>
              <Text fontSize={13} color="$brandTextLight">
                {t('postDetail.revenue')}
              </Text>
            </Card>
          </XStack>
        </YStack>

        {/* Tracking link */}
        {trackingLink ? (
          <YStack gap="$2">
            <Text fontSize={15} fontWeight="600" color="$brandSecondary">
              {t('postDetail.trackingLink')}
            </Text>
            <Pressable onPress={handleCopyLink}>
              <Card variant="outlined" padding="$3">
                <XStack alignItems="center" gap="$2">
                  <Text
                    fontSize={13}
                    color="$brandPrimary"
                    flex={1}
                    numberOfLines={2}
                  >
                    {trackingLink}
                  </Text>
                  <Ionicons
                    name={copiedField === 'link' ? 'checkmark-circle' : 'copy-outline'}
                    size={18}
                    color={copiedField === 'link' ? '#16A34A' : '#0F766E'}
                  />
                </XStack>
              </Card>
            </Pressable>
          </YStack>
        ) : null}

        {/* Archive / Unarchive */}
        <YStack gap="$2">
          <Button
            variant="outline"
            onPress={async () => {
              if (!post) return;
              const isArchived = !!post.archived_at;
              if (isArchived) {
                try {
                  const updated = await unarchivePost(post.id);
                  setPost(updated);
                } catch {
                  // keep state
                }
              } else {
                Alert.alert(
                  t('postDetail.confirmArchiveTitle'),
                  t('postDetail.confirmArchiveMessage'),
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('postDetail.archive'),
                      onPress: async () => {
                        try {
                          const updated = await archivePost(post.id);
                          setPost(updated);
                        } catch {
                          // keep state
                        }
                      },
                    },
                  ],
                );
              }
            }}
            icon={
              <Ionicons
                name={post.archived_at ? 'arrow-undo-outline' : 'archive-outline'}
                size={18}
                color="#6B7280"
              />
            }
          >
            {post.archived_at ? t('postDetail.unarchive') : t('postDetail.archive')}
          </Button>
        </YStack>

        {/* Leads attracted */}
        <YStack gap="$2">
          <Text fontSize={15} fontWeight="600" color="$brandSecondary">
            {t('postDetail.leadsAttracted')} ({leads.length})
          </Text>
          {leads.length === 0 ? (
            <Card variant="flat" padding="$4" alignItems="center">
              <Ionicons name="people-outline" size={32} color="#D1D5DB" />
              <Text
                fontSize={14}
                color="$brandTextLight"
                textAlign="center"
                marginTop="$2"
              >
                {t('postDetail.noLeads')}
              </Text>
            </Card>
          ) : (
            <YStack gap="$2">
              {leads.map((lead) => (
                <Pressable
                  key={lead.id}
                  onPress={() => router.push(`/(app)/lead-detail?id=${lead.id}`)}
                >
                  <Card variant="elevated" padding="$3">
                    <XStack alignItems="center" gap="$3">
                      <XStack
                        width={36}
                        height={36}
                        borderRadius={18}
                        backgroundColor={STATUS_COLORS[lead.status] + '18'}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Text
                          fontSize={14}
                          fontWeight="bold"
                          color={STATUS_COLORS[lead.status]}
                        >
                          {(lead.name ?? '?')[0].toUpperCase()}
                        </Text>
                      </XStack>
                      <YStack flex={1} gap="$0.5">
                        <Text fontSize={14} fontWeight="600" color="$brandSecondary">
                          {lead.name ?? '—'}
                        </Text>
                        {lead.phone && (
                          <Text fontSize={12} color="$brandTextLight">
                            {lead.phone}
                          </Text>
                        )}
                      </YStack>
                      <YStack alignItems="flex-end" gap="$1">
                        <XStack
                          paddingHorizontal="$2"
                          paddingVertical="$0.5"
                          borderRadius={6}
                          backgroundColor={STATUS_COLORS[lead.status] + '18'}
                        >
                          <Text
                            fontSize={11}
                            fontWeight="600"
                            color={STATUS_COLORS[lead.status]}
                          >
                            {t(`leads.status${lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}`)}
                          </Text>
                        </XStack>
                        <Text fontSize={11} color="$brandTextLight">
                          {timeAgo(lead.created_at, t)}
                        </Text>
                      </YStack>
                    </XStack>
                  </Card>
                </Pressable>
              ))}
            </YStack>
          )}
        </YStack>
      </YStack>
    </ScrollView>
  );
}
