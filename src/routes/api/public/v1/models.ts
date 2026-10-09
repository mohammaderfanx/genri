import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { models } from "@/lib/models";
import { authenticateApiKey, cors, json } from "@/lib/api-auth.server";

const Query = z.object({
  category: z.string().max(40).optional(),
  license: z.enum(["proprietary", "open"]).optional(),
  max_price: z.coerce.number().positive().optional(),
  max_ttft_ms: z.coerce.number().positive().optional(),
  min_elo: z.coerce.number().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(50),
});

export const Route = createFileRoute("/api/public/v1/models")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const auth = await authenticateApiKey(request, "GET /v1/models");
        if ("error" in auth) return auth.error;
        const q = Query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!q.success) { await auth.log(400); return json({ error: "Invalid query", issues: q.error.issues.map((i) => i.message) }, 400); }
        const f = q.data;
        const data = models
          .filter((m) => !f.category || m.category.toLowerCase().includes(f.category.toLowerCase()))
          .filter((m) => !f.license || (f.license === "open") === (m.license !== "Proprietary API"))
          .filter((m) => !f.max_price || m.pricing.blended <= f.max_price)
          .filter((m) => !f.max_ttft_ms || Math.min(...m.hosts.map((h) => h.ttft)) <= f.max_ttft_ms)
          .filter((m) => !f.min_elo || m.scores.elo >= f.min_elo)
          .slice(0, f.limit)
          .map((m) => ({ id: m.slug, name: m.name, provider: m.provider, category: m.category, license: m.license, context_window: m.contextWindow, pricing: m.pricing, inference_metrics: m.metrics, benchmark_scores: m.scores, hosts: m.hosts }));
        await auth.log(200);
        return json({ object: "list", data }, 200, { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" });
      },
    },
  },
});
