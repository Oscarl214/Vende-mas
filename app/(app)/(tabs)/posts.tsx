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
import { getPosts, type Post } from '@/lib/posts';
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

export default function PostsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, profile } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const lang = profile?.default_language ?? 'es';

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [postsData, leadsData] = await Promise.all([
        getPosts(user.id),
        getLeads(user.id),
      ]);
      setPosts(postsData);
      setLeads(leadsData);
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
    }
  }, [user]);

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
        <Card variant="outlined" padding="$4" gap="$3">
          <Text fontSize={13} color="$brandTextLight">
            {truncateCaption(post.generated_content)}
          </Text>
          <XStack flexWrap="wrap" gap="$2" alignItems="center">
            <XStack alignItems="center" gap="$1">
              <Ionicons name={iconName as any} size={16} color="#6B7280" />
              <Text fontSize={12} color="$brandTextLight" textTransform="capitalize">
                {platform.replace('_', ' ')}
              </Text>
            </XStack>
            <Text fontSize={12} color="$brandTextLight">
              {formatPostDate(post.created_at, lang)}
            </Text>
          </XStack>
          {link
            ? (
              <XStack alignItems="center" gap="$2" flexWrap="wrap">
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
                      size={16}
                      color={isCopied ? '#16A34A' : '#0F766E'}
                    />
                    <Text
                      fontSize={12}
                      fontWeight="500"
                      color={isCopied ? '$brandSuccess' : '$brandPrimary'}
                    >
                      {isCopied ? t('posts.copied') : t('posts.copyLink')}
                    </Text>
                  </XStack>
                </Pressable>
              </XStack>
              )
            : null}
          <XStack gap="$4">
            <XStack alignItems="center" gap="$1">
              <Ionicons name="hand-left-outline" size={14} color="#6B7280" />
              <Text fontSize={13} color="$brandText">
                {t('posts.clicks', { count: clicks })}
              </Text>
            </XStack>
            <XStack alignItems="center" gap="$1">
              <Ionicons name="people-outline" size={14} color="#6B7280" />
              <Text fontSize={13} color="$brandText">
                {t('posts.leads', { count: leadsCount })}
              </Text>
            </XStack>
          </XStack>
        </Card>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <YStack flex={1} padding="$5" justifyContent="center" alignItems="center">
        <Text color="$brandTextLight">{t('posts.loading')}</Text>
      </YStack>
    );
  }

  if (posts.length === 0) {
    return (
      <YStack flex={1} padding="$5" gap="$4" justifyContent="center">
        <Text fontSize={18} fontWeight="600" color="$brandSecondary" textAlign="center">
          {t('posts.emptyTitle')}
        </Text>
        <Text fontSize={14} color="$brandTextLight" textAlign="center">
          {t('posts.emptyMessage')}
        </Text>
        <Button
          variant="primary"
          onPress={() => router.push('/(app)/generate-post')}
        >
          {t('posts.generateFirst')}
        </Button>
      </YStack>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      ItemSeparatorComponent={() => <YStack height={12} />}
    />
  );
}
