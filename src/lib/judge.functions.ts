import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CANDIDATES, JUDGES, isAllowed } from "./ai/catalog";

export type JudgeScore = { judge: string; score: number; reasoning: string[]; verdict: string; swapped?: boolean; ms?: number };

export const listJudgeEvals = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./supabase-public.server");
  const { data, error } = await publicClient().from("multi_agent_judge_evals")
    .select("id, prompt_text, candidate_model_id, candidate_output, judge_committee, individual_scores, consensus_score, bias_mitigation_meta, created_at")
    .order("created_at", { ascending: false }).limit(20);
  if (error) { console.error(error); return []; }
  return data;
});

export const generateCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ prompt: z.string().trim().min(3).max(2000), model: z.string() }).parse(d))
  .handler(async ({ data }) => {
    if (!isAllowed(CANDIDATES, data.model)) return { ok: false as const, error: "Unknown model." };
    const { generate, GatewayError } = await import("./ai/gateway.server");
    try {
      const r = await generate(data.model, "Answer the user's task directly and concisely. Use Markdown code blocks for code. Keep the answer under 250 words.", data.prompt);
      return { ok: true as const, text: r.text, ttftMs: r.ttftMs, totalMs: r.totalMs };
    } catch (e) {
      console.error(e);
      return { ok: false as const, error: e instanceof GatewayError ? e.message : "The model didn't respond." };
    }
  });

function parseJudge(text: string) {
  const m = text.match(/\{[\s\S]*\}/);
  try {
    const j = JSON.parse(m ? m[0] : text) as { score?: unknown; reasoning?: unknown; verdict?: unknown };
    const score = Math.max(1, Math.min(10, Math.round(Number(j.score) || 0)));
    const reasoning = Array.isArray(j.reasoning) ? j.reasoning.map(String).slice(0, 6) : [];
    return { score: score || 5, reasoning, verdict: String(j.verdict ?? "").slice(0, 300) };
  } catch {
    return { score: 5, reasoning: [text.slice(0, 400)], verdict: "Judge returned unstructured feedback." };
  }
}

export const runJudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ prompt: z.string().max(2000), answer: z.string().max(8000), judge: z.string(), swapped: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    if (!isAllowed(JUDGES, data.judge)) return { ok: false as const, error: "Unknown judge." };
    const { generate, GatewayError } = await import("./ai/gateway.server");
    const rubric = "Rubric: correctness (40%), completeness (25%), clarity (20%), efficiency/conciseness (15%). Do not reward length for its own sake.";
    const task = `TASK:\n${data.prompt}`;
    const answer = `CANDIDATE ANSWER:\n${data.answer}`;
    // Position swap: alternate whether the rubric/task or the answer comes first to detect ordering bias.
    const body = data.swapped ? `${answer}\n\n${task}\n\n${rubric}` : `${task}\n\n${rubric}\n\n${answer}`;
    try {
      const r = await generate(data.judge,
        "You are a strict, impartial evaluator on an AI judging committee. Think step by step, then reply with only a JSON object: {\"score\": integer 1-10, \"reasoning\": [3 to 5 short strings, one per reasoning step], \"verdict\": one sentence}.",
        body, "medium");
      return { ok: true as const, ...parseJudge(r.text), ms: r.totalMs };
    } catch (e) {
      console.error(e);
      return { ok: false as const, error: e instanceof GatewayError ? e.message : "This judge didn't respond." };
    }
  });

export const saveJudgeEval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    prompt: z.string().max(2000), candidate: z.string(), output: z.string().max(8000),
    scores: z.array(z.object({ judge: z.string(), score: z.number(), reasoning: z.array(z.string()), verdict: z.string(), swapped: z.boolean().optional() })).max(3),
    consensus: z.number(), positionSwap: z.boolean(), lengthPenalty: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("multi_agent_judge_evals").insert({
      prompt_text: data.prompt, candidate_model_id: data.candidate, candidate_output: data.output,
      judge_committee: data.scores.map((s) => s.judge), individual_scores: data.scores, consensus_score: data.consensus,
      bias_mitigation_meta: { position_swap_verified: data.positionSwap, length_penalty_applied: data.lengthPenalty },
      created_by: context.userId,
    }).select("id").single();
    if (error) { console.error(error); return { ok: false as const, error: "Couldn't save this evaluation." }; }
    return { ok: true as const, id: row.id };
  });
