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

    const warmLeadContext = isWarmLead
      ? `\n- This lead already showed strong interest — they filled out a contact form and were directed to the booking page. Treat them as a WARM lead, not a cold one.
- Don't introduce the business or services from scratch — they already know what you offer.
- Focus on confirming their booking, answering questions, or nudging them to finalize if they haven't yet.`
      : "";

    const eventDateContext = hasEventDate
      ? `\n- The lead mentioned an event date: ${lead.event_date}. Reference it naturally (e.g. "for your event on [date]").`
      : "";

    const systemPrompt = `You are a helpful assistant for a small business owner. You write short, warm follow-up messages to potential customers.

Rules:
- Write in ${lang}
- Match the business tone: ${profile.tone ?? "Friendly"}
- Keep it under 300 characters
- Be personal — use the lead's first name
- Sound like a real person texting, not a bot
- No greetings like "Dear" — keep it casual and warm${warmLeadContext}${eventDateContext}
- Include a soft CTA (confirm booking, suggest a time, or ask if they need anything)

Respond with ONLY the message text. No labels, no explanations, no quotes.`;

    const userPrompt = `Business: ${profile.business_name}
Type: ${profile.business_type}
Location: ${profile.location}
Services: ${profile.services_offered}
${bookingUrl ? `Booking / lead capture link: ${bookingUrl}` : ""}

Lead Name: ${lead.name ?? "Customer"}
Lead Phone: ${lead.phone ?? "N/A"}
Lead Email: ${lead.email ?? "N/A"}
Lead Status: ${lead.status}
${hasEventDate ? `Event Date: ${lead.event_date}` : ""}
${isWarmLead ? "Source: Filled out smart link form (already shown interest & redirected to booking page)" : "Source: Manually added"}

Generate a follow-up message for this lead.`;

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
