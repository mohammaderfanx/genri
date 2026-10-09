import { createHash } from "node:crypto";

export const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
export const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors, ...extra } });

/** Verifies a Genri API key, enforces its per-minute limit and returns a logger for the request. */
export async function authenticateApiKey(request: Request, endpoint: string) {
  const url = new URL(request.url);
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = header || url.searchParams.get("key") || "";
  if (!/^gk_live_[a-f0-9]{48}$/.test(token)) return { error: json({ error: "Missing or invalid API key" }, 401) };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: key } = await supabaseAdmin.from("api_keys").select("id, org_id, rate_limit_rpm").eq("key_hash", hash).maybeSingle();
  if (!key) return { error: json({ error: "Invalid API key" }, 401) };

  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabaseAdmin.from("api_request_logs").select("id", { count: "exact", head: true }).eq("api_key_id", key.id).gte("created_at", since);
  const t0 = Date.now();
  const log = async (status: number, model?: string) => {
    await supabaseAdmin.from("api_request_logs").insert({ api_key_id: key.id, org_id: key.org_id, endpoint, model: model ?? null, status, latency_ms: Date.now() - t0 });
    await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);
  };
  if ((count ?? 0) >= key.rate_limit_rpm) {
    await log(429);
    return { error: json({ error: "Rate limit exceeded" }, 429, { "Retry-After": "60" }) };
  }
  return { key, log };
}
