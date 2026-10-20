import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: cors });
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function matched(text: string, phrase: string) {
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegExp(phrase)}(?=$|[^\\p{L}\\p{N}_])`, "iu").test(text);
}
function moderate(text: string, rules: any[]) {
  let value = text;
  for (const rule of rules) {
    if (!rule || typeof rule.phrase !== "string" || !rule.phrase.trim()) continue;
    if (!matched(value, rule.phrase.trim())) continue;
    if (rule.action === "reject" || rule.action === "hide") return null;
    if (rule.action === "mask") {
      const phrase = rule.phrase.trim();
      value = value.replace(new RegExp(`(^|[^\\p{L}\\p{N}_])(${escapeRegExp(phrase)})(?=$|[^\\p{L}\\p{N}_])`, "giu"), (_m, prefix: string, word: string) => prefix + "•".repeat(Math.min(12, word.length)));
    }
  }
  return value;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });
  const authorization = req.headers.get("Authorization") ?? "";
  const jwt = authorization.replace(/^Bearer\s+/i, "");
  if (!jwt) return reply(401, { error: "authentication_required" });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return reply(503, { error: "server_not_configured" });
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !authData.user) return reply(401, { error: "invalid_session" });
  let body: any;
  try { body = await req.json(); } catch { return reply(400, { error: "invalid_json" }); }
  if (body?.event_type !== "ticker") return reply(400, { error: "unsupported_event_type" });
  const text = String(body?.payload?.text ?? "").trim();
  if (!text || text.length > 280) return reply(400, { error: "invalid_ticker_text" });
  const { data: settings, error: settingsError } = await admin.from("creator_settings").select("live_tools_config").eq("user_id", authData.user.id).maybeSingle();
  if (settingsError) return reply(500, { error: "settings_unavailable" });
  const config = settings?.live_tools_config ?? {};
  if (config?.tool_switches?.ticker === false || config?.ticker?.enabled === false) return reply(403, { error: "ticker_disabled" });
  const maxChars = Math.max(10, Math.min(280, Number(config?.ticker?.max_chars) || 120));
  if (text.length > maxChars) return reply(400, { error: "ticker_too_long", max_chars: maxChars });
  const moderation = config?.moderation;
  const rules = moderation?.enabled === true && Array.isArray(moderation.rules) ? moderation.rules.slice(0, 200) : [];
  const moderatedText = moderate(text, rules);
  if (moderatedText === null) return reply(422, { error: "message_blocked_by_moderation" });
  const { data: event, error: insertError } = await admin.from("overlay_events").insert({
    creator_id: authData.user.id,
    event_type: "ticker",
    payload: { text: moderatedText, display_seconds: Math.max(3, Math.min(120, Number(config?.ticker?.display_seconds) || 10)) }
  }).select("id,event_type,created_at").single();
  if (insertError || !event) return reply(500, { error: "event_create_failed" });
  return reply(201, { event, message: "Running text event added to the overlay queue." });
});