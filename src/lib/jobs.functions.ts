import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CANDIDATES, isAllowed } from "./ai/catalog";

const probePrompts = [
  "Write a Python function that checks whether a string is a palindrome.",
  "Summarize the difference between TCP and UDP in two sentences.",
  "What is 17 * 23? Show the calculation briefly.",
  "Give three tips for writing readable SQL.",
  "Translate 'The deployment finished successfully' into German and French.",
  "Explain what a race condition is in one short paragraph.",
  "List the HTTP status codes for not found, rate limited and server error.",
  "Write a regex that matches an ISO date like 2026-10-08.",
  "Name two trade-offs of microservices versus a monolith.",
  "Convert 72 degrees Fahrenheit to Celsius.",
  "Write a one-line JavaScript expression that removes duplicates from an array.",
  "What does the CAP theorem say? One sentence.",
];

const pct = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? 0; };

/** Runs a real latency benchmark against a gateway model; progress is written to the job row (streamed to viewers via realtime). */
export const startBenchmarkJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ model: z.string(), prompts: z.number().int().min(3).max(12), concurrency: z.number().int().min(1).max(4) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!isAllowed(CANDIDATES, data.model)) return { ok: false as const, error: "Unknown model." };
    const { generate, GatewayError } = await import("./ai/gateway.server");
    const sb = context.supabase;
    const { data: job, error } = await sb.from("eval_execution_jobs").insert({
      model_id: data.model, suite_name: "Live Latency Probe", status: "running", concurrency: data.concurrency,
      total_prompts: data.prompts, completed_prompts: 0, created_by: context.userId, started_at: new Date().toISOString(),
    }).select("id").single();
    if (error || !job) { console.error(error); return { ok: false as const, error: "Couldn't start the job." }; }

    const ttfts: number[] = []; const tpss: number[] = []; const outs: number[] = [];
    let next = 0; let done = 0; let failure: string | null = null;
    const worker = async () => {
      while (!failure && next < data.prompts) {
        const prompt = probePrompts[next++ % probePrompts.length]!;
        try {
          const r = await generate(data.model, "Answer briefly.", prompt);
          ttfts.push(r.ttftMs); tpss.push(r.tps); outs.push(r.outputTokens);
        } catch (e) {
          failure = e instanceof GatewayError ? e.message : "A probe failed.";
          return;
        }
        done++;
        await sb.from("eval_execution_jobs").update({ completed_prompts: done }).eq("id", job.id);
      }
    };
    await Promise.all(Array.from({ length: data.concurrency }, worker));

    const mean = outs.reduce((a, b) => a + b, 0) / Math.max(1, outs.length);
    const variance = outs.length ? Math.sqrt(outs.reduce((a, b) => a + (b - mean) ** 2, 0) / outs.length) / Math.max(1, mean) : 0;
    const telemetry = { p50_ttft_ms: pct(ttfts, 50), p99_ttft_ms: pct(ttfts, 99), median_tps: pct(tpss, 50), token_variance: +variance.toFixed(2) };
    await sb.from("eval_execution_jobs").update({ status: failure ? "failed" : "completed", completed_prompts: done, raw_telemetry: telemetry, completed_at: new Date().toISOString() }).eq("id", job.id);
    return failure ? { ok: false as const, error: failure } : { ok: true as const, telemetry };
  });
