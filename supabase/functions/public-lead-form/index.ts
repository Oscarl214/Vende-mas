import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const userId = body.user_id;
    const name = (body.name ?? "").trim();
    const phone = (body.phone ?? "").trim() || null;
    const email = (body.email ?? "").trim() || null;
    const sourcePostId = (body.source_post_id ?? "").trim() || null;
    const eventDate = (body.event_date ?? "").trim() || null;

    if (!userId) {
      return json({ error: "Missing user_id" }, 400);
    }

    if (!name) {
      return json({ error: "Name is required" }, 400);
    }

    const { data: canStore } = await supabase.rpc("check_can_store_lead", {
      p_user_id: userId,
    });

    if (canStore === false) {
      return json({ closed: true, error: "Form is temporarily unavailable" });
    }

    await supabase.from("leads").insert({
      user_id: userId,
      name,
      phone,
      email,
      source_post_id: sourcePostId,
      event_date: eventDate,
      status: "new",
    });

    await supabase.rpc("increment_lead_count", {
      p_user_id: userId,
    });

    return json({ success: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
