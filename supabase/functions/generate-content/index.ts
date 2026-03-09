import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const PLATFORM_CONSTRAINTS: Record<
  string,
  { maxChars: number; style: string }
> = {
  instagram: {
    maxChars: 2200,
    style: `This is an Instagram post. Write it like a Stories caption, not a press release.
Open with something that makes someone stop scrolling. First 1-2 lines are everything.
Use line breaks for readability. No giant paragraphs.
A few emojis are fine if they feel natural, but don't litter the post with them.
Drop the booking link casually before the hashtags.
End with 5-10 LOCAL hashtags (your city, your neighborhood, your niche). These help locals find you.`,
  },
  facebook: {
    maxChars: 500,
    style: `This is a Facebook post. People actually read on Facebook so you can tell a short story.
Write like you're posting on your personal page about something cool happening at work.
Ask a real question if it makes sense. Something people would actually answer, not a rhetorical marketing question.
Tag-a-friend CTAs work great here ("know someone who needs this?").
Keep hashtags to 0-3 max. Facebook isn't Instagram.
Put the booking link right in the post, don't hide it.`,
  },
  tiktok: {
    maxChars: 300,
    style: `This is a TikTok caption/script. Talk like you're filming yourself on your phone.
The first line has to make someone stop scrolling. Something surprising, funny, or "wait what?" ("You can get THIS in [city] for $50??" or "POV: you just found the best kept secret in [neighborhood]").
If the first line is boring, nothing else matters.
Include 1-2 lines of suggested ON-SCREEN TEXT (mark with [ON SCREEN: ...]).
Optionally include a quick voiceover script (mark with [VOICEOVER: ...]).
Keep it short and punchy. 3-5 hashtags max, mix trending and local.`,
  },
  google_business: {
    maxChars: 1500,
    style: `This is a Google Business post. People reading this are already searching for what you offer, so get to the point.
Write like a helpful neighbor giving a recommendation, not a brochure.
Mention your location and service area by name. This helps you show up in local searches.
Tell them exactly what to do next: call, book, visit.
No hashtags. This isn't social media, it's your business listing.`,
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

    const systemPrompt = `You ARE a small local business owner writing your own social media post. You're not a marketer, not a copywriter. You're the person who runs this business every day and is talking directly to your community.

Write in ${lang}. Your vibe is: ${profile.tone ?? "Friendly"}.
Stay under ${charLimit} characters.

${constraints.style}

HOW TO SOUND LIKE A REAL PERSON:
Write in first person. Say "I", "we", "my", "our". You own this business. Talk like it.
Write the way you'd text a friend about something exciting at work. Sentence fragments are fine. Starting a sentence with "And" or "But" is fine. Contractions always.
Vary your rhythm naturally. Don't alternate short-long-short-long like a metronome.
Be specific. Use real details from the promotion: actual prices, actual dates, actual service names. Never be vague when you have concrete info.
If a booking link is provided, drop it in naturally like you'd share a link with a friend ("grab your spot here:" or "sign up before it fills up:"). Don't make it feel like an ad placement.
Mention your city/neighborhood by name so locals feel like this is for them.
If there's an event or deadline, build the post around it. That's your hook.
Focus on what the customer gets, not what you do. "You'll walk out feeling amazing" beats "We provide premium services."

NEVER DO THESE:
Never use any kind of dash as a separator or pause between thoughts. No em dashes, no en dashes, no hyphens used as dashes. Do not write "something - something" or "something — something" or "something – something". Hyphens are ONLY okay inside compound words like "well-known" or "real-time". If you need a pause, use a period and start a new sentence, or use "and", "so", "because", or just a comma.
Never use colons to introduce lists or ideas. Never use numbered or bulleted lists in the post.
Never use these words: "delve", "leverage", "elevate", "transformative", "pivotal", "game-changer", "essential", "crucial", "it's important to note", "in conclusion", "not only...but also", "at the end of the day", "unlock", "navigate", "landscape", "foster", "streamline", "cutting-edge", "comprehensive".
Never write in third person about the business. You ARE the business.
Never sound like a press release or a brochure. No corporate-speak.
Never use the structure "Not only X, but also Y" or "It's not about X, it's about Y."
Never wrap the entire post in quotation marks.

Respond with valid JSON only. No markdown fences, no extra text. Use this exact shape:
{"caption":"<the post text>","postStrength":{"score":<number 1-10 with one decimal>,"reason":"<one sentence in ${lang}>"}}

The "caption" value is the post text you wrote.
The "score" rates how effective this post is based on: (1) alignment with the content goal — does it clearly serve a ${contentGoal} post?, (2) platform fit — does it follow ${platform.replace("_", " ")} best practices?, (3) clarity and authenticity — does it sound like a real person?
The "reason" must be written in ${lang}. It should be a short, encouraging insight explaining why the post works or one specific way to make it stronger.`;

    const userPrompt = `Your business: ${profile.business_name}
What you do: ${profile.business_type}
Where: ${profile.location}
Services: ${profile.services_offered}
Who you're talking to: ${profile.target_customer}

Goal of this post: ${contentGoal}
Platform: ${platform.replace("_", " ")}
${hasPromotion ? `What you're promoting: ${promotionDetails}` : ""}
${bookingUrl ? `Your booking link (work it in naturally): ${bookingUrl}` : ""}

Write the post.`;

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
    const raw = result.content?.[0]?.text?.trim() ?? "";

    let caption = raw;
    let postStrength: { score: number; reason: string } | undefined;

    try {
      const parsed = JSON.parse(raw);
      if (parsed.caption) {
        caption = parsed.caption;
        if (parsed.postStrength?.score != null && parsed.postStrength?.reason) {
          postStrength = {
            score: Math.round(parsed.postStrength.score * 10) / 10,
            reason: parsed.postStrength.reason,
          };
        }
      }
    } catch {
      // AI returned plain text instead of JSON — use as-is
    }

    return new Response(JSON.stringify({ caption, postStrength }), {
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
