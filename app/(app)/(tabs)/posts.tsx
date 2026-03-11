import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable } from 'react-native';
import { YStack, Text, XStack } from 'tamagui';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/hooks/use-session';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPosts, archivePost, unarchivePost, type Post } from '@/lib/posts';
import { getLeads, type Lead } from '@/lib/leads';
import { getEffectiveBookingUrl } from '@/lib/booking';

const PLATFORM_ICONS: Record<string, string> = {
  facebook: 'logo-facebook',
  instagram: 'logo-instagram',
  tiktok: 'logo-tiktok',
  google_business: 'business',
};

const CAPTION_MAX = 70;

function formatPostDate(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function truncateCaption(text: string): string {
  const t = text.trim();
  if (t.length <= CAPTION_MAX) return t;
  return t.slice(0, CAPTION_MAX).trim() + '…';
}

type PostFilter = 'active' | 'archive';

export default function PostsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, profile } = useSession();
  const [postFilter, setPostFilter] = useState<PostFilter>('active');
  const [posts, setPosts] = useState<Post[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const lang = profile?.default_language ?? 'es';

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [postsData, leadsData] = await Promise.all([
        getPosts(user.id, { archived: postFilter === 'archive' }),
        getLeads(user.id),
      ]);
      setPosts(postsData);
      setLeads(leadsData);
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
    }
  }, [user, postFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const leadCountByPost = useCallback(
    (postId: string) =>
      leads.filter((l) => l.source_post_id === postId).length,
    [leads],
  );

  const handleArchive = useCallback(async (post: Post) => {
    try {
      await archivePost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch {
      // keep previous state
    }
  }, []);

  const handleUnarchive = useCallback(async (post: Post) => {
    try {
      await unarchivePost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch {
      // keep previous state
    }
  }, []);

  const handleCopyLink = useCallback(async (postId: string) => {
    if (!user || !profile) return;
    const url = getEffectiveBookingUrl(profile, user.id, postId);
    await Clipboard.setStringAsync(url);
    setCopiedId(postId);
    setTimeout(() => setCopiedId(null), 2000);
  }, [user, profile]);

  const trackingLink = (post: Post) =>
    user && profile
      ? getEffectiveBookingUrl(profile, user.id, post.id)
      : '';

  const renderItem = ({ item: post }: { item: Post }) => {
    const platform = post.platform ?? 'instagram';
    const iconName = PLATFORM_ICONS[platform] ?? 'document-text';
    const clicks = post.click_count ?? 0;
    const leadsCount = leadCountByPost(post.id);
    const link = trackingLink(post);
    const isCopied = copiedId === post.id;

    return (
      <Pressable onPress={() => router.push(`/(app)/post-detail?id=${post.id}`)}>
        <Card variant="elevated" padding="$4" gap="$3">
          {/* Platform + date row */}
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap="$1.5">
              <XStack
                width={26}
                height={26}
                borderRadius={8}
                backgroundColor="$brandBackground"
                justifyContent="center"
                alignItems="center"
              >
                <Ionicons name={iconName as any} size={14} color="#6B7280" />
              </XStack>
              <Text fontSize={12} fontWeight="600" color="$brandTextLight" textTransform="capitalize">
                {platform.replace('_', ' ')}
              </Text>
            </XStack>
            <Text fontSize={11} color="$brandTextLight">
              {formatPostDate(post.created_at, lang)}
            </Text>
          </XStack>

          {/* Caption preview */}
          <Text fontSize={14} color="$brandText" lineHeight={20}>
            {truncateCaption(post.generated_content)}
          </Text>

          {/* Tracking link */}
          {link ? (
            <XStack
              backgroundColor="$brandBackground"
              borderRadius={8}
              paddingHorizontal="$2.5"
              paddingVertical="$1.5"
              alignItems="center"
              gap="$2"
            >
              <Text
                fontSize={11}
                color="$brandPrimary"
                numberOfLines={1}
                flex={1}
                minWidth={0}
              >
                {link.length > 42 ? link.slice(0, 42) + '…' : link}
              </Text>
              <Pressable onPress={(e) => { e.stopPropagation(); handleCopyLink(post.id); }}>
                <XStack alignItems="center" gap="$1">
                  <Ionicons
                    name={isCopied ? 'checkmark-circle' : 'copy-outline'}
                    size={15}
                    color={isCopied ? '#16A34A' : '#0F766E'}
                  />
                  <Text fontSize={12} fontWeight="600" color={isCopied ? '$brandSuccess' : '$brandPrimary'}>
                    {isCopied ? t('posts.copied') : t('posts.copyLink')}
                  </Text>
                </XStack>
              </Pressable>
            </XStack>
          ) : null}

          {/* Stats + archive row */}
          <XStack justifyContent="space-between" alignItems="center">
            <XStack gap="$3">
              <XStack alignItems="center" gap="$1">
                <Ionicons name="hand-left-outline" size={13} color="#9CA3AF" />
                <Text fontSize={12} fontWeight="500" color="$brandTextLight">
                  {t('posts.clicks', { count: clicks })}
                </Text>
              </XStack>
              <XStack alignItems="center" gap="$1">
                <Ionicons name="people-outline" size={13} color="#9CA3AF" />
                <Text fontSize={12} fontWeight="500" color="$brandTextLight">
                  {t('posts.leads', { count: leadsCount })}
                </Text>
              </XStack>
            </XStack>
            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                if (postFilter === 'archive') {
                  handleUnarchive(post);
                } else {
                  handleArchive(post);
                }
              }}
            >
              <XStack alignItems="center" gap="$1">
                <Ionicons
                  name={postFilter === 'archive' ? 'arrow-undo-outline' : 'archive-outline'}
                  size={14}
                  color="#9CA3AF"
                />
                <Text fontSize={12} fontWeight="500" color="$brandTextLight">
                  {postFilter === 'archive' ? t('posts.unarchive') : t('posts.archive')}
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        </Card>
      </Pressable>
    );
  };

  const emptyMessage =
    postFilter === 'archive'
      ? t('posts.archivedEmpty')
      : t('posts.emptyMessage');
  const emptyTitle =
    postFilter === 'archive'
      ? t('posts.archivedEmptyTitle')
      : t('posts.emptyTitle');

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Active | Archive segment */}
      <XStack paddingHorizontal="$4" paddingTop="$3" paddingBottom="$2" gap="$2">
        {(['active', 'archive'] as const).map((f) => {
          const active = postFilter === f;
          return (
            <Pressable key={f} onPress={() => setPostFilter(f)}>
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
                  {f === 'active' ? t('posts.active') : t('posts.archive')}
                </Text>
              </XStack>
            </Pressable>
          );
        })}
      </XStack>

      {loading ? (
        <YStack flex={1} padding="$5" justifyContent="center" alignItems="center">
          <Text color="$brandTextLight">{t('posts.loading')}</Text>
        </YStack>
      ) : posts.length === 0 ? (
        <YStack flex={1} padding="$5" gap="$4" justifyContent="center">
          <Text fontSize={18} fontWeight="600" color="$brandSecondary" textAlign="center">
            {emptyTitle}
          </Text>
          <Text fontSize={14} color="$brandTextLight" textAlign="center">
            {emptyMessage}
          </Text>
          {postFilter === 'active' && (
            <Button
              variant="primary"
              onPress={() => router.push('/(app)/generate-post')}
            >
              {t('posts.generateFirst')}
            </Button>
          )}
        </YStack>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <YStack height={12} />}
        />
      )}
    </YStack>
  );
}
