/**
 * Returns the lead form URL (in-app) for a user. Used when booking_type is internal
 * or when we need the form URL for a specific post.
 */
export function buildFormUrl(
  userId: string,
  businessName: string,
  postId?: string,
): string {
  const formBase = process.env.EXPO_PUBLIC_FORM_URL ?? '';
  const apiBase = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const biz = encodeURIComponent(businessName);
  let url = `${formBase}?user_id=${userId}&business=${biz}&api=${encodeURIComponent(apiBase)}`;
  if (postId) url += `&source_post_id=${postId}`;
  return url;
}

type ProfileWithBooking = {
  booking_type?: string | null;
  booking_url?: string | null;
  business_name?: string | null;
};

/**
 * Returns the effective booking URL: external link if set, otherwise the in-app lead form URL.
 */
export function getEffectiveBookingUrl(
  profile: ProfileWithBooking | null,
  userId: string,
  postId?: string,
): string {
  if (profile?.booking_type === 'external' && profile?.booking_url) {
    return profile.booking_url;
  }
  return buildFormUrl(userId, profile?.business_name ?? '', postId);
}
