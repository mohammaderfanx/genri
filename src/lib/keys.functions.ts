import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orgId: z.string().uuid(), name: z.string().trim().min(1).max(80), rpm: z.number().int().min(1).max(10000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { randomBytes, createHash } = await import("node:crypto");
    const secret = `gk_live_${randomBytes(24).toString("hex")}`;
    const hash = createHash("sha256").update(secret).digest("hex");
    // RLS only lets owners/admins of the org insert keys.
    const { data: row, error } = await context.supabase.from("api_keys")
      .insert({ org_id: data.orgId, name: data.name, rate_limit_rpm: data.rpm, key_hash: hash, key_prefix: secret.slice(0, 14) })
      .select("id").single();
    if (error) { console.error(error); return { ok: false as const, error: "Only owners and admins can create keys." }; }
    await context.supabase.from("audit_logs").insert({ org_id: data.orgId, actor_id: context.userId, actor_email: (context.claims as { email?: string }).email ?? null, action: "api_key.created", detail: { name: data.name, key_id: row.id } });
    return { ok: true as const, secret, id: row.id };
  });
