import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
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
    const postId = (body.post_id ?? "").trim();
    const userId = (body.user_id ?? "").trim();

    if (!postId || !userId) {
      return json({ error: "Missing post_id or user_id" }, 400);
    }

    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("id, user_id, click_count")
      .eq("id", postId)
      .single();

    if (fetchError || !post) {
      return json({ error: "Post not found" }, 404);
    }

    if (post.user_id !== userId) {
      return json({ error: "Post not found" }, 404);
    }

    const currentCount = (post as { click_count?: number }).click_count ?? 0;
    const { error: updateError } = await supabase
      .from("posts")
      .update({ click_count: currentCount + 1 })
      .eq("id", postId)
      .eq("user_id", userId);

    if (updateError) {
      return json({ error: updateError.message }, 500);
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
