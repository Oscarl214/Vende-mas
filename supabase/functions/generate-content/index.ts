import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const PLATFORM_CONSTRAINTS: Record<
  string,
  { maxChars: number; style: string }
> = {
  facebook: {
    maxChars: 500,
    style:
      "Engagement-focused. Use questions, emojis sparingly, and a clear CTA. No hashtags unless necessary.",
  },
  instagram: {
    maxChars: 2200,
    style:
      "Caption should be ~150 chars for optimal engagement, followed by a line break and 5-10 relevant hashtags. Use emojis naturally.",
  },
  google_business: {
    maxChars: 1500,
    style:
      "Local SEO focused. Mention the business location naturally. Professional tone. Include a CTA with business action (call, visit, book).",
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

    const systemPrompt = `You are a social media marketing expert for small local businesses. You write compelling, authentic posts that drive real engagement and sales.

Rules:
- Write in ${lang}
- Match the business owner's tone: ${profile.tone ?? "Friendly"}
- Stay under ${charLimit} characters
- ${constraints.style}
- Always include a clear call-to-action (CTA)
- Sound human and authentic, never corporate or generic
- Reference the business context naturally

Respond with ONLY the caption text. No labels, no explanations, no quotes around it.`;

    const userPrompt = `Business: ${profile.business_name}
Type: ${profile.business_type}
Location: ${profile.location}
Services: ${profile.services_offered}
Target Customer: ${profile.target_customer}

Content Goal: ${contentGoal}
Platform: ${platform.replace("_", " ")}
${promotionDetails ? `Promoting: ${promotionDetails}` : ""}
${bookingUrl ? `Booking / lead capture link for CTA: ${bookingUrl}` : ""}

Generate one optimized post.`;

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
