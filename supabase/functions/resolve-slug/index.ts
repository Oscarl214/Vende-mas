import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(req.url);
    const slug = (url.searchParams.get("slug") ?? "").trim().toLowerCase();

    if (!slug) {
      return json({ error: "Missing slug parameter" }, 400);
    }

    const slugPattern = slug.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    const { data, error } = await supabase
      .from("profiles")
      .select("id, business_name, booking_url, logo_url, default_language")
      .ilike("slug", slugPattern)
      .single();

    if (error || !data) {
      return json({ error: "Business not found" }, 404);
    }

    const anonKey = Deno.env.get("PUBLIC_ANON_KEY") ?? null;

    return json({
      user_id: data.id,
      business_name: data.business_name,
      booking_url: data.booking_url,
      logo_url: data.logo_url,
      language: data.default_language || null,
      anon_key: anonKey,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
