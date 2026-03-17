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
      .select("id, user_id, click_count, platform")
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

    // Push notification — fire and forget, don't block the response
    (async () => {
      try {
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("token")
          .eq("user_id", userId);

        if (tokens && tokens.length > 0) {
          const platform = (post as { platform?: string }).platform ?? "social";
          const platformLabel = platform.replace("_", " ");
          const totalClicks = currentCount + 1;
          const messages = tokens.map((row: { token: string }) => ({
            to: row.token,
            sound: "default",
            title: "📈 Post click!",
            body: totalClicks === 1
              ? `Someone clicked your ${platformLabel} post — they might reach out!`
              : `Your ${platformLabel} post now has ${totalClicks} clicks!`,
            data: { type: "post_click", postId },
          }));

          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(messages),
          });
        }
      } catch {
        // Push failure must never affect click tracking
      }
    })();

    return json({ success: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
