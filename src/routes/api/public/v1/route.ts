import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { models, isImage } from "@/lib/models";
import { authenticateApiKey, cors, json } from "@/lib/api-auth.server";

const Body = z.object({
  prompt: z.string().trim().min(1).max(4000),
  sla: z.object({
    max_ttft_ms: z.number().positive().optional(),
    max_price: z.number().positive().optional(),
    priority: z.enum(["quality", "cost", "speed"]).default("quality"),
    open_weights_only: z.boolean().optional(),
  }).default({ priority: "quality" }),
});
// Each catalog tier is served by a real model on the Lovable AI gateway.
const servedBy = (price: number) => (price < 1 ? "openai/gpt-5.4-nano" : price < 5 ? "openai/gpt-6-luna" : "openai/gpt-5.4-mini");

export const Route = createFileRoute("/api/public/v1")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const auth = await authenticateApiKey(request, "POST /v1/route");
        if ("error" in auth) return auth.error;
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) { await auth.log(400); return json({ error: "Invalid body", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400); }
        const { prompt, sla } = parsed.data;
        const pool = models.filter((m) => !isImage(m))
          .filter((m) => !sla.open_weights_only || m.license !== "Proprietary API")
          .filter((m) => !sla.max_price || m.pricing.blended <= sla.max_price)
          .filter((m) => !sla.max_ttft_ms || Math.min(...m.hosts.map((h) => h.ttft)) <= sla.max_ttft_ms);
        if (!pool.length) { await auth.log(422); return json({ error: "No model satisfies this SLA" }, 422); }
        const pick = [...pool].sort((a, b) => sla.priority === "cost" ? a.pricing.blended - b.pricing.blended : sla.priority === "speed" ? b.metrics.tps - a.metrics.tps : b.scores.elo - a.scores.elo)[0]!;
        const backend = servedBy(pick.pricing.blended);
        const { generate, GatewayError } = await import("@/lib/ai/gateway.server");
        try {
          const r = await generate(backend, "You are a helpful assistant. Be concise.", prompt);
          await auth.log(200, pick.slug);
          return json({ routed_model: pick.slug, served_by: backend, candidates_considered: pool.length, output: r.text, telemetry: { ttft_ms: r.ttftMs, total_ms: r.totalMs, tps: r.tps, output_tokens: r.outputTokens } });
        } catch (e) {
          const status = e instanceof GatewayError ? e.status : 500;
          await auth.log(status >= 400 ? status : 500, pick.slug);
          return json({ error: e instanceof GatewayError ? e.message : "Upstream error" }, status >= 400 ? status : 500);
        }
      },
    },
  },
});
