import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

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
    const { lead, profile, bookingUrl } = await req.json();

    const lang = profile.default_language === "en" ? "English" : "Spanish";

    const isWarmLead = lead.came_from_smart_link === true;
    const hasEventDate = !!lead.event_date;
    const hasBookingLink = !!bookingUrl;

    let leadContextRules = "";

    if (hasEventDate) {
      leadContextRules += `\n- PRIORITY #1 — EVENT DATE: The lead has an event on ${lead.event_date}. Build the ENTIRE message around this date. Reference it explicitly. Create urgency around it ("your [date] event is coming up!", "let's lock in [date] before spots fill up").`;
    }

    if (isWarmLead) {
      leadContextRules += `\n- This is a WARM lead — they already filled out your contact form and were sent to your booking page. They know your business. Don't re-introduce yourself or your services.
- Focus on: did they complete the booking? If not, nudge them to finalize. If yes, confirm details.`;
    }

    if (hasBookingLink) {
      leadContextRules += `\n- INCLUDE THE BOOKING LINK in the message: ${bookingUrl} — make it easy for them to take action right now. Place it at the end as a direct CTA.`;
    }

    leadContextRules += `\n- URGENCY: Add natural scarcity — "spots are filling up fast", "we only have a few openings left", "secure your date before it's taken". Don't be pushy, but create real FOMO.`;
    leadContextRules += `\n- LOCAL TRUST: Mention the business location naturally to build proximity and trust — "right here in ${profile.location ?? "your area"}".`;

    const systemPrompt = `You are a conversion-focused follow-up assistant for a small local business. Your goal is to turn this lead into a PAYING customer with one short, warm message.

Rules:
- Write in ${lang}
- Match the business tone: ${profile.tone ?? "Friendly"}
- Keep it under 350 characters
- Use the lead's first name
- Sound like a real person texting, not a bot or a salesperson
- No greetings like "Dear" — casual and warm${leadContextRules}

Respond with ONLY the message text. No labels, no explanations, no quotes.`;

    const userPrompt = `Business: ${profile.business_name}
Type: ${profile.business_type}
Location: ${profile.location}
Services: ${profile.services_offered}

Lead Name: ${lead.name ?? "Customer"}
Lead Status: ${lead.status}
${hasEventDate ? `Event Date (center the message around this): ${lead.event_date}` : ""}
${isWarmLead ? "Source: Already filled out smart link form & was redirected to booking page (WARM lead)" : "Source: Manually added (may need more context about the business)"}
${hasBookingLink ? `Booking link to include: ${bookingUrl}` : ""}

Generate a follow-up message that drives this lead to book and pay.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
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
    const message = result.content?.[0]?.text?.trim() ?? "";

    return new Response(JSON.stringify({ message }), {
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
