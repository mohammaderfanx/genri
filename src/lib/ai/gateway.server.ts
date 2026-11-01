import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

const BASE = "https://ai.gateway.lovable.dev/v1";

export class GatewayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function key() {
  const k = process.env["LOVABLE_API_KEY"];
  if (!k) throw new GatewayError(500, "AI is not configured for this project.");
  return k;
}

/** One-shot Responses call, streamed and consumed server-side. Returns text plus timing telemetry. */
export async function generate(model: string, instructions: string, prompt: string, effort: "low" | "medium" = "low") {
  const apiKey = key();
  const runId = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({ baseURL: BASE, apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: runId.fetch });
  const t0 = Date.now();
  let ttft = 0;
  let failure: unknown;
  const result = streamText({
    model: provider.responses(model),
    system: instructions,
    prompt,
    onError: ({ error }: { error: unknown }) => { failure = error; },
    providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: effort, reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
  });
  let text = "";
  for await (const chunk of result.textStream) { if (!ttft) ttft = Date.now() - t0; text += chunk; }
  if (failure || !text) throw toGatewayError(failure);
  const usage = await result.usage;
  const ms = Date.now() - t0;
  const out = usage.outputTokens ?? Math.round(text.length / 4);
  return { text, ttftMs: ttft, totalMs: ms, outputTokens: out, tps: Math.round(out / Math.max(0.001, (ms - ttft) / 1000)) };
}

export async function embed(input: string[]) {
  const apiKey = key();
  const r = await fetch(`${BASE}/embeddings`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "openai/text-embedding-3-small", input }) });
  if (!r.ok) throw new GatewayError(r.status, await safeMessage(r));
  const j = (await r.json()) as { data: { index: number; embedding: number[] }[] };
  return j.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function safeMessage(r: Response) {
  try { const j = (await r.json()) as { error?: { message?: string }; message?: string }; return j.error?.message ?? j.message ?? `AI request failed (${r.status})`; } catch { return `AI request failed (${r.status})`; }
}

function toGatewayError(e: unknown) {
  const err = e as { statusCode?: number; message?: string } | undefined;
  const status = err?.statusCode ?? 502;
  const msg = status === 402 ? "AI credits are used up for this workspace. Add credits to keep running evaluations."
    : status === 429 ? "Too many AI requests right now. Please try again in a minute."
    : status === 403 ? "This AI model isn't available for this workspace."
    : "The AI model didn't return an answer.";
  return new GatewayError(status, msg);
}

