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

/**
 * Returns a slug-based smart link: e.g. https://app.com/r/vidabebidas
 */
export function buildSmartLink(slug: string): string {
  const formBase = process.env.EXPO_PUBLIC_FORM_URL ?? '';
  return `${formBase}/r/${slug}`;
}

type ProfileWithBooking = {
  booking_type?: string | null;
  booking_url?: string | null;
  business_name?: string | null;
  slug?: string | null;
};

/**
 * Returns the link to share with customers. Always points to the lead capture
 * form so we can track leads first. The form itself handles redirecting to the
 * external booking page (if one is set) after the visitor submits their info.
 */
export function getEffectiveBookingUrl(
  profile: ProfileWithBooking | null,
  userId: string,
  postId?: string,
): string {
  if (profile?.slug) {
    return buildSmartLink(profile.slug);
  }
  return buildFormUrl(userId, profile?.business_name ?? '', postId);
}
