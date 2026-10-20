import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS", "Content-Type": "application/json" };
const reply = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: cors });
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
type ModerationRule = { phrase: string; action: "reject" | "mask" | "hide" };
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function matchingRules(text: string, rules: ModerationRule[]) {
  return rules.filter((rule) => rule.phrase.trim() && new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegExp(rule.phrase.trim())}(?=$|[^\\p{L}\\p{N}_])`, "iu").test(text));
}
function applyModeration(payload: Record<string, unknown>, rules: ModerationRule[]) {
  const contentKeys = ["message", "text", "donor_message", "content"];
  const found: ModerationRule[] = [];
  for (const key of contentKeys) {
    const value = payload[key];
    if (typeof value !== "string") continue;
    found.push(...matchingRules(value, rules));
  }
  if (found.some((rule) => rule.action === "reject" || rule.action === "hide")) return null;
  const next = { ...payload };
  for (const key of contentKeys) {
    const value = next[key];
    if (typeof value !== "string") continue;
    let masked = value;
    for (const rule of rules) {
      if (rule.action !== "mask" || !rule.phrase.trim()) continue;
      masked = masked.replace(new RegExp(`(^|[^\\p{L}\\p{N}_])(${escapeRegExp(rule.phrase.trim())})(?=$|[^\\p{L}\\p{N}_])`, "giu"), (_match, prefix: string, word: string) => prefix + "•".repeat(Math.min(12, word.length)));
    }
    next[key] = masked;
  }
  return next;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return reply(405, { error: "method_not_allowed" });
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (token.length < 32 || token.length > 200) return reply(401, { error: "invalid_overlay_token" });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return reply(503, { error: "server_not_configured" });
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const tokenHash = await sha256(token);
  const { data: overlay, error: tokenError } = await admin.from("overlay_tokens").select("id,creator_id").eq("token_hash", tokenHash).is("revoked_at", null).maybeSingle();
  if (tokenError || !overlay) return reply(401, { error: "invalid_overlay_token" });
  const { data: settings } = await admin.from("creator_settings").select("live_tools_config").eq("user_id", overlay.creator_id).maybeSingle();
  const moderation = settings?.live_tools_config?.moderation;
  const rules: ModerationRule[] = moderation?.enabled === true && Array.isArray(moderation.rules)
    ? moderation.rules.filter((r: any) => r && typeof r.phrase === "string" && ["reject", "mask", "hide"].includes(r.action)).slice(0, 200)
    : [];
  const params = new URL(req.url).searchParams;
  const after = params.get("after");
  let query = admin.from("overlay_events").select("id,event_type,payload,created_at").eq("creator_id", overlay.creator_id).order("created_at", { ascending: true }).limit(25);
  if (after) query = query.gt("created_at", after);
  const { data, error } = await query;
  if (error) return reply(500, { error: "feed_unavailable" });
  const events = (data ?? []).flatMap((event) => {
    const payload = event.payload && typeof event.payload === "object" && !Array.isArray(event.payload) ? event.payload as Record<string, unknown> : {};
    const moderated = applyModeration(payload, rules);
    return moderated ? [{ ...event, payload: moderated }] : [];
  });
  await admin.from("overlay_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", overlay.id);
  return reply(200, { events, server_time: new Date().toISOString() });
});