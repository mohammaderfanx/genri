import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const semanticSearch = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ query: z.string().trim().min(3).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const { embed, GatewayError } = await import("./ai/gateway.server");
    const { publicClient } = await import("./supabase-public.server");
    try {
      const [vec] = await embed([data.query]);
      const { data: rows, error } = await publicClient().rpc("match_models", { query_embedding: JSON.stringify(vec), match_count: 20 });
      if (error) { console.error(error); return { matches: [], error: "Search is unavailable right now." }; }
      return { matches: (rows ?? []).map((r) => ({ slug: r.model_id, similarity: r.similarity })), error: null as string | null };
    } catch (e) {
      console.error(e);
      return { matches: [], error: e instanceof GatewayError ? e.message : "Search is unavailable right now." };
    }
  });
