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

    const systemPrompt = `You are a helpful assistant for a small business owner. You write short, warm follow-up messages to potential customers.

Rules:
- Write in ${lang}
- Match the business tone: ${profile.tone ?? "Friendly"}
- Keep it under 300 characters
- Be personal — use the lead's first name
- Reference the business services naturally
- Include a soft CTA (confirm interest, suggest a time, ask a question)
- Sound like a real person texting, not a bot
- No greetings like "Dear" — keep it casual and warm

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
