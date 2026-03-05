import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const PLATFORM_CONSTRAINTS: Record<
  string,
  { maxChars: number; style: string }
> = {
  instagram: {
    maxChars: 2200,
    style: `Instagram = visual + aspirational + brand building.
- Open with a strong hook in the first 1–2 lines to stop the scroll.
- Use line breaks liberally for readability — no walls of text.
- Slightly aesthetic, aspirational tone. Make the reader picture themselves there.
- Use emojis naturally but don't overdo it.
- Soft CTA — "Book your date before it's gone", "Link in bio", "DM us".
- Place the booking link right before the hashtags.
- End with 5–10 LOCAL hashtags (city, neighborhood, niche — e.g. #DallasEvents #DFWWeddings).`,
  },
  facebook: {
    maxChars: 500,
    style: `Facebook users read more — conversational tone works best.
- More conversational, storytelling tone. Write like you're talking to a neighbor.
- Slightly longer explanations are OK — Facebook users engage with context.
- Community-driven CTA — "Tag someone planning a wedding", "Share with a friend who needs this".
- Fewer hashtags (0–3 max, only if relevant).
- Link-friendly — include the booking link directly in the post body, not hidden.
- Use questions to drive comments and shares.`,
  },
  tiktok: {
    maxChars: 300,
    style: `TikTok = hook-driven algorithm. This is a caption/script for a short video.
- AGGRESSIVE hook in the very first line — something that makes people stop scrolling ("Wait... you can get THIS in Dallas for $50?", "POV: You just found the best [service] in [city]").
- Scroll-stopping opener is everything. If the first line is boring, nothing else matters.
- Suggest 1–2 lines of ON-SCREEN TEXT overlay (mark with [ON SCREEN: ...]).
- Optionally include a short voiceover script (mark with [VOICEOVER: ...]).
- Strong, direct CTA — "Link in bio", "Book NOW before [date]", "Comment BOOK and I'll send you the link".
- Minimal hashtags — 3–5 MAX, trend-relevant and local.
- Keep it punchy. Short sentences. No fluff.`,
  },
  google_business: {
    maxChars: 1500,
    style: `Google Business = search intent. People here are ready to buy.
- Zero fluff. Get straight to the point.
- Clear service description — what you do, who it's for.
- MUST mention the business location and service area by name for local SEO.
- Direct, action-oriented CTA — "Call now", "Book today", "Visit us at [address]".
- NO hashtags. This is not social media, it's a business listing.
- Professional but warm. Think helpful local expert, not corporate.`,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { contentGoal, platform, promotionDetails, maxLength, profile, bookingUrl } =
      await req.json();

    const constraints = PLATFORM_CONSTRAINTS[platform] ?? PLATFORM_CONSTRAINTS.facebook;
    const lang = profile.default_language === "en" ? "English" : "Spanish";

    const LENGTH_MAP: Record<string, number> = {
      short: 100,
      medium: 250,
      long: 500,
    };
    const charLimit = maxLength && LENGTH_MAP[maxLength]
      ? LENGTH_MAP[maxLength]
      : constraints.maxChars;

    const hasPromotion = !!promotionDetails;

    const systemPrompt = `You are a revenue-focused social media marketing expert for small local businesses. Every post you write has ONE job: get the reader to click the booking link and become a paying customer.

Rules:
- Write in ${lang}
- Match the business owner's tone: ${profile.tone ?? "Friendly"}
- Stay under ${charLimit} characters
- ${constraints.style}
- Sound human and authentic, never corporate or generic

Revenue-driving strategies (use 2-3 per post, as relevant):
1. BOOKING LINK AS PRIMARY CTA: If a booking link is provided, it MUST appear in the post. End with a direct action like "Book now:" or "Reserve your spot:" followed by the link. Never bury it.
2. URGENCY & SCARCITY: Create real urgency — "Only a few spots left for [month]", "Limited availability this weekend", "Don't miss out". If the promotion mentions dates or events, anchor urgency around them.
3. LOCAL TARGETING: Mention the business location and surrounding area by name to build trust — "right here in [city]", "Serving [area] for X years", "your neighborhood [business type]". Make locals feel this is for THEM.
4. EVENT-FIRST: If the promotion mentions an event, date, or seasonal occasion, make it the centerpiece of the post. Build the entire narrative around it.
5. CLEAR VALUE: Lead with what the customer GETS, not what the business does. Focus on outcomes and transformation.

Respond with ONLY the caption text. No labels, no explanations, no quotes around it.`;

    const userPrompt = `Business: ${profile.business_name}
Type: ${profile.business_type}
Location: ${profile.location} (weave this into the post for local targeting)
Services: ${profile.services_offered}
Target Customer: ${profile.target_customer}

Content Goal: ${contentGoal}
Platform: ${platform.replace("_", " ")}
${hasPromotion ? `Promoting (make this the focus): ${promotionDetails}` : ""}
${bookingUrl ? `BOOKING LINK (MUST include in post as CTA): ${bookingUrl}` : ""}

Generate one optimized, revenue-driving post.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: userPrompt }],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return new Response(JSON.stringify({ error: errBody }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const caption = result.content?.[0]?.text?.trim() ?? "";

    return new Response(JSON.stringify({ caption }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
