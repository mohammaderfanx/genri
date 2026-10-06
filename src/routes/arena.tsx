import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Shuffle, Send } from "lucide-react";
import { models, isImage, type AIModel } from "@/lib/models";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/arena")({
  validateSearch: z.object({ a: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Arena — Blind AI Model Battles | Genri AI" },
      { name: "description", content: "Pit two AI models against each other blind, vote for the better answer and watch Elo ratings move." },
      { property: "og:title", content: "Genri AI Arena — Blind Battles" },
      { property: "og:description", content: "Crowd-sourced, blind A/B testing of AI models with live Elo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Arena,
});

const llms = models.filter((m) => !isImage(m));
const presets: Record<string, string> = {
  "Complex Python Refactor": "Refactor this nested-loop Python function that deduplicates user records into an O(n) solution and explain the trade-offs.",
  "System Architecture Design": "Design a globally distributed rate limiter for an API serving 1M requests/sec. Outline components and failure modes.",
  "Mathematical Proof": "Prove that there are infinitely many primes, then generalize to primes of the form 4k+3.",
};

function respond(m: AIModel, prompt: string, seed: number) {
  const styles = [
    `**Approach.** Breaking this down into three parts.\n\n1. Identify the core constraint in: "${prompt.slice(0, 60)}…"\n2. Choose a structure that makes the invariant explicit.\n3. Verify against edge cases.\n\n\`\`\`python\ndef solve(items):\n    seen = {}\n    for it in items:\n        seen.setdefault(it.key, it)\n    return list(seen.values())\n\`\`\`\n\nThis runs in O(n) time and O(n) space — the trade-off is memory for speed.`,
    `Here's a concise answer.\n\nThe key insight is to avoid repeated work. Use a hash-based index so each element is touched once. For scale, partition by key and merge results; for correctness, assert idempotency at each boundary.\n\n- Time: O(n)\n- Space: O(k) distinct keys\n- Failure mode: hot keys — mitigate with consistent hashing and local buffers.`,
    `Let me reason step by step.\n\nAssume the contrary and derive a contradiction: construct N = product of all candidates, adjust by a constant, and observe its factors cannot lie in the assumed finite set. The same template generalizes by choosing the constant to preserve the residue class.\n\n∴ The claim holds. ∎`,
  ];
  return styles[(seed + m.name.length) % styles.length]!;
}

type Side = { model: AIModel; text: string; shown: number; ttft: number; tps: number; done: boolean };
const pick2 = (fixed?: string): [AIModel, AIModel] => {
  const a = llms.find((m) => m.slug === fixed) ?? llms[Math.floor(Math.random() * llms.length)]!;
  const rest = llms.filter((m) => m !== a);
  return [a, rest[Math.floor(Math.random() * rest.length)]!];
};

function Arena() {
  const { a: fixedA } = Route.useSearch();
  const [mode, setMode] = useState<"blind" | "side">(fixedA ? "side" : "blind");
  const [selA, setSelA] = useState(fixedA ?? "claude-3-5-sonnet");
  const [selB, setSelB] = useState("gpt-4o");
  const [prompt, setPrompt] = useState(presets["Complex Python Refactor"]!);
  const [sides, setSides] = useState<Side[] | null>(null);
  const [vote, setVote] = useState<string | null>(null);
  const [elo, setElo] = useState<Record<string, number>>(() => Object.fromEntries(models.map((m) => [m.slug, m.scores.elo])));
  const [delta, setDelta] = useState<Record<string, number>>({});
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const run = () => {
    const pair = mode === "blind" ? pick2() : [llms.find((m) => m.slug === selA)!, llms.find((m) => m.slug === selB)!] as const;
    const seed = Math.floor(Math.random() * 3);
    const start = performance.now();
    setVote(null); setDelta({});
    setSides(pair.map((m, i) => ({ model: m, text: respond(m, prompt, seed + i), shown: 0, ttft: 0, tps: 0, done: false })));
    if (timer.current) clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      const t = performance.now() - start;
      setSides((prev) => {
        if (!prev) return prev;
        const next = prev.map((s) => {
          const wait = Math.min(s.model.metrics.ttft, 1500) * 0.6;
          if (t < wait || s.done) return s;
          const rate = Math.min(s.model.metrics.tps, 250) * 4; // chars/s
          const shown = Math.min(s.text.length, Math.floor(((t - wait) / 1000) * rate));
          return { ...s, shown, ttft: Math.round(wait), tps: s.model.metrics.tps, done: shown >= s.text.length };
        });
        if (next.every((s) => s.done) && timer.current) clearInterval(timer.current);
        return next;
      });
    }, 40);
  };

  const cast = (v: "a" | "b" | "tie" | "bad") => {
    if (!sides || vote) return;
    const A = sides[0]!.model, B = sides[1]!.model;
    const ra = elo[A.slug]!, rb = elo[B.slug]!;
    const ea = 1 / (1 + 10 ** ((rb - ra) / 400));
    const sa = v === "a" ? 1 : v === "b" ? 0 : 0.5;
    const k = v === "bad" ? 8 : 32;
    const da = Math.round(k * (sa - ea));
    setElo({ ...elo, [A.slug]: ra + da, [B.slug]: rb - da });
    setDelta({ [A.slug]: da, [B.slug]: -da });
    setVote(v);
  };

  const done = sides?.every((s) => s.done);
  const reveal = mode === "side" || !!vote;
  const board = [...llms].sort((x, y) => elo[y.slug]! - elo[x.slug]!);

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Arena</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Which answer is better?</h1></div>
          <div className="flex rounded-md border p-0.5 text-sm">
            {(["blind", "side"] as const).map((x) => (
              <button key={x} onClick={() => { setMode(x); setSides(null); }} className={`rounded px-3 py-1 ${mode === x ? "bg-secondary" : "text-muted-foreground"}`}>{x === "blind" ? "Blind Battle" : "Side-by-Side"}</button>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-card p-4">
          {mode === "side" && (
            <div className="mb-3 grid grid-cols-2 gap-3">
              {[[selA, setSelA], [selB, setSelB]].map(([v, set], i) => (
                <Select key={i} value={v as string} onValueChange={set as (s: string) => void}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{llms.map((m) => <SelectItem key={m.slug} value={m.slug}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              ))}
            </div>
          )}
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="w-full resize-none bg-transparent text-sm outline-none" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {Object.keys(presets).map((p) => <button key={p} onClick={() => setPrompt(presets[p]!)} className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground">{p}</button>)}
            <button onClick={run} disabled={!prompt.trim()} className="ml-auto inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {mode === "blind" ? <Shuffle className="h-4 w-4" /> : <Send className="h-4 w-4" />}{mode === "blind" ? "Start battle" : "Run both"}
            </button>
          </div>
        </div>

        {sides && (
          <>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {sides.map((s, i) => (
                <div key={i} className="flex min-h-72 flex-col rounded-xl border bg-card">
                  <div className="flex items-center justify-between border-b px-4 py-2.5">
                    <span className="font-medium">{reveal ? <Link to="/models/$slug" params={{ slug: s.model.slug }} className="hover:text-primary">{s.model.name}</Link> : `Model ${i ? "B" : "A"}`}</span>
                    {delta[s.model.slug] !== undefined && (
                      <span className={`animate-rise font-mono text-sm ${delta[s.model.slug]! >= 0 ? "text-gain" : "text-loss"}`}>{elo[s.model.slug]} ({delta[s.model.slug]! >= 0 ? "+" : ""}{delta[s.model.slug]})</span>
                    )}
                  </div>
                  <pre className="flex-1 whitespace-pre-wrap p-4 font-sans text-sm leading-relaxed">{s.text.slice(0, s.shown)}{!s.done && <span className="caret text-primary">▍</span>}</pre>
                  <div className="flex gap-4 border-t px-4 py-2 font-mono text-xs text-muted-foreground tabular">
                    <span>TTFT <b className="text-speed">{s.ttft || "—"}ms</b></span>
                    <span>TPS <b className="text-speed">{s.tps || "—"}</b></span>
                    <span>Cost <b className="text-foreground">${((s.shown / 4) * s.model.pricing.output / 1e6).toFixed(5)}</b></span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              {([["a", "👈 A is better"], ["b", "👉 B is better"], ["tie", "🤝 Tie"], ["bad", "👎 Both are bad"]] as const).map(([v, l]) => (
                <button key={v} disabled={!done || !!vote} onClick={() => cast(v)} className={`rounded-md border py-2.5 text-sm transition-colors disabled:opacity-40 ${vote === v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}>{l}</button>
              ))}
            </div>
          </>
        )}
      </div>

      <aside className="h-fit rounded-xl border bg-card p-4 lg:sticky lg:top-20">
        <h2 className="text-sm font-semibold">Live Elo leaderboard</h2>
        <ol className="mt-3 space-y-1 font-mono text-sm tabular">
          {board.map((m, i) => (
            <li key={m.slug} className="flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-muted">
              <span className="w-4 text-muted-foreground">{i + 1}</span>
              <span className="flex-1 truncate font-sans">{m.name}</span>
              <span className={delta[m.slug] ? (delta[m.slug]! > 0 ? "text-gain" : "text-loss") : ""}>{elo[m.slug]}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
