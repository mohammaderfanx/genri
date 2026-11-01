import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gavel, ShieldCheck, Scale, Download, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listJudgeEvals, generateCandidate, runJudge, saveJudgeEval, type JudgeScore } from "@/lib/judge.functions";
import { startBenchmarkJob } from "@/lib/jobs.functions";
import { CANDIDATES, JUDGES, labelOf } from "@/lib/ai/catalog";
import { models } from "@/lib/models";
import { useUser } from "@/lib/auth";
import { download, toCsv } from "@/lib/exporters";
import { PageTitle, Panel } from "@/components/SiteHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/evals/judge-arena")({
  head: () => ({
    meta: [
      { title: "Multi-Agent Judge Arena — Genri AI" },
      { name: "description", content: "Score AI answers with a three-model judging committee, position-swap and length-bias checks, and live benchmark jobs." },
      { property: "og:title", content: "Multi-Agent Judge Arena — Genri AI" },
      { property: "og:description", content: "Committee consensus scoring and autonomous benchmark runs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JudgeArena,
});

type Job = Database["public"]["Tables"]["eval_execution_jobs"]["Row"];
const presets = [
  "Refactor a Python function that fetches 50 URLs sequentially into an async version with bounded concurrency.",
  "Explain the CAP theorem to a junior engineer in under 120 words.",
  "Write a SQL query returning the top 3 customers by revenue per country.",
];
const nameOf = (id: string) => models.find((m) => m.slug === id)?.name ?? labelOf(id);
const WORD_TARGET = 250;

type Lane = { judge: string; state: "idle" | "running" | "done" | "error"; result?: JudgeScore; error?: string };

function JudgeArena() {
  const { user } = useUser();
  const qc = useQueryClient();
  const gen = useServerFn(generateCandidate);
  const judge = useServerFn(runJudge);
  const save = useServerFn(saveJudgeEval);
  const startJob = useServerFn(startBenchmarkJob);
  const history = useQuery({ queryKey: ["judge-evals"], queryFn: () => listJudgeEvals(), staleTime: 30_000 });

  const [prompt, setPrompt] = useState(presets[0]!);
  const [candidate, setCandidate] = useState<string>(CANDIDATES[0].id);
  const [output, setOutput] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "candidate" | "judging" | "done">("idle");
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const run = async () => {
    setPhase("candidate"); setOutput(null); setLanes([]); setSelected(null);
    const c = await gen({ data: { prompt, model: candidate } });
    if (!c.ok) { setPhase("idle"); return void toast.error(c.error); }
    setOutput(c.text); setPhase("judging");
    const init: Lane[] = JUDGES.map((j) => ({ judge: j.id, state: "running" }));
    setLanes(init);
    const results = await Promise.all(JUDGES.map(async (j, i) => {
      const r = await judge({ data: { prompt, answer: c.text, judge: j.id, swapped: i % 2 === 1 } });
      setLanes((ls) => ls.map((l) => l.judge === j.id ? (r.ok ? { judge: j.id, state: "done", result: { judge: j.id, score: r.score, reasoning: r.reasoning, verdict: r.verdict, swapped: i % 2 === 1, ms: r.ms } } : { judge: j.id, state: "error", error: r.error }) : l));
      return r.ok ? { judge: j.id, score: r.score, reasoning: r.reasoning, verdict: r.verdict, swapped: i % 2 === 1 } : null;
    }));
    const ok = results.filter(Boolean) as JudgeScore[];
    setPhase("done");
    if (!ok.length) return;
    const { consensus, swapOk, lengthPenalty } = consensusOf(ok, c.text);
    const s = await save({ data: { prompt, candidate, output: c.text, scores: ok, consensus, positionSwap: swapOk, lengthPenalty } });
    if (s.ok) { qc.invalidateQueries({ queryKey: ["judge-evals"] }); setSelected(s.id); }
  };

  const doneScores = lanes.filter((l) => l.result).map((l) => l.result!);
  const live = output && doneScores.length ? consensusOf(doneScores, output) : null;
  const viewed = selected ? history.data?.find((h) => h.id === selected) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-10">
      <PageTitle eyebrow="Judge arena" title="A committee of AI judges" sub="One model answers; three different models grade it in parallel. Order is swapped for one judge and over-long answers are penalised to reduce bias." />

      <div className="rounded-xl border bg-card p-4">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} className="w-full resize-none bg-transparent text-sm outline-none" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {presets.map((p, i) => <button key={i} onClick={() => setPrompt(p)} className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground">Preset {i + 1}</button>)}
          <Select value={candidate} onValueChange={setCandidate}>
            <SelectTrigger className="ml-auto h-9 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{CANDIDATES.map((c) => <SelectItem key={c.id} value={c.id}>Candidate: {c.label}</SelectItem>)}</SelectContent>
          </Select>
          {user ? (
            <button onClick={run} disabled={phase === "candidate" || phase === "judging" || prompt.trim().length < 3} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {phase === "candidate" || phase === "judging" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}Run committee
            </button>
          ) : <Link to="/auth" search={{ next: "/evals/judge-arena" }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Sign in to run</Link>}
        </div>
      </div>

      {(output || phase === "candidate") && (
        <div className="grid gap-4 lg:grid-cols-4">
          <Panel title={`Candidate · ${labelOf(candidate)}`} className="lg:col-span-1">
            {output ? <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">{output}</pre> : <Pending label="Generating answer…" />}
          </Panel>
          {lanes.map((l) => (
            <Panel key={l.judge} title={labelOf(l.judge)} sub={l.result?.swapped ? "Answer shown before rubric" : "Rubric shown before answer"}>
              {l.state === "running" && <Pending label="Reviewing…" />}
              {l.state === "error" && <p className="text-sm text-destructive">{l.error}</p>}
              {l.result && <JudgeCard s={l.result} />}
            </Panel>
          ))}
        </div>
      )}

      {live && <ConsensusBar c={live} n={doneScores.length} />}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel title="Evaluation history" sub="Every committee run is saved.">
          <div className="mb-2 flex gap-2">
            <button onClick={() => download("genri-judge-evals.json", JSON.stringify(history.data ?? [], null, 2))} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-accent"><Download className="h-3.5 w-3.5" />JSON</button>
            <button onClick={() => download("genri-judge-evals.csv", toCsv((history.data ?? []).map((h) => ({ id: h.id, created_at: h.created_at, candidate: h.candidate_model_id, consensus: h.consensus_score, prompt: h.prompt_text }))), "text/csv")} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-accent"><Download className="h-3.5 w-3.5" />CSV</button>
          </div>
          <ul className="divide-y">
            {(history.data ?? []).map((h) => (
              <li key={h.id}>
                <button onClick={() => setSelected(h.id)} className={`flex w-full items-center gap-3 py-2.5 text-left text-sm ${selected === h.id ? "text-primary" : ""}`}>
                  <span className="w-10 font-mono text-lg font-semibold tabular">{Number(h.consensus_score ?? 0).toFixed(1)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate">{h.prompt_text}</span><span className="text-xs text-muted-foreground">{nameOf(h.candidate_model_id)} · {new Date(h.created_at).toLocaleString()}</span></span>
                </button>
              </li>
            ))}
            {history.isLoading && <li className="py-6 text-sm text-muted-foreground">Loading…</li>}
          </ul>
        </Panel>
        <Panel title={viewed ? "Score matrix" : "Select an evaluation"} sub={viewed ? nameOf(viewed.candidate_model_id) : undefined}>
          {viewed && <ScoreMatrix e={viewed} />}
        </Panel>
      </div>

      <JobsPanel signedIn={!!user} start={async (model, prompts, concurrency) => {
        const r = await startJob({ data: { model, prompts, concurrency } });
        if (!r.ok) toast.error(r.error); else toast.success("Benchmark completed");
      }} />
    </div>
  );
}

function consensusOf(scores: JudgeScore[], output: string) {
  const words = output.split(/\s+/).length;
  const lengthPenalty = words > WORD_TARGET * 1.5;
  const raw = scores.reduce((a, s) => a + s.score, 0) / scores.length;
  const swapped = scores.filter((s) => s.swapped).map((s) => s.score);
  const normal = scores.filter((s) => !s.swapped).map((s) => s.score);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  // Ordering bias check: swapped-order judges should agree with normal-order judges within 2 points.
  const swapOk = !swapped.length || !normal.length || Math.abs(avg(swapped) - avg(normal)) <= 2;
  const consensus = +Math.max(1, raw - (lengthPenalty ? 0.5 : 0)).toFixed(1);
  const spread = Math.max(...scores.map((s) => s.score)) - Math.min(...scores.map((s) => s.score));
  return { consensus, swapOk, lengthPenalty, spread };
}

function Pending({ label }: { label: string }) {
  return <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" />{label}</div>;
}

function JudgeCard({ s }: { s: JudgeScore }) {
  return (
    <div className="animate-rise space-y-3">
      <div className="flex items-baseline gap-2"><span className="font-mono text-3xl font-semibold text-primary tabular">{s.score}</span><span className="text-xs text-muted-foreground">/10{s.ms ? ` · ${(s.ms / 1000).toFixed(1)}s` : ""}</span></div>
      <ol className="space-y-1.5 border-l pl-3 text-xs text-muted-foreground">{s.reasoning.map((r, i) => <li key={i}><span className="font-mono text-speed">{i + 1}.</span> {r}</li>)}</ol>
      <p className="text-sm">{s.verdict}</p>
    </div>
  );
}

function ConsensusBar({ c, n }: { c: ReturnType<typeof consensusOf>; n: number }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
      <Scale className="h-5 w-5 text-primary" />
      <div><div className="text-xs text-muted-foreground">Consensus ({n} judges)</div><div className="font-mono text-3xl font-semibold tabular">{c.consensus}<span className="text-base text-muted-foreground">/10</span></div></div>
      <Badge ok={c.swapOk} label={c.swapOk ? "Position swap verified" : "Ordering bias detected"} />
      <Badge ok={!c.lengthPenalty} label={c.lengthPenalty ? "Length penalty −0.5" : "Length normal"} />
      <span className="font-mono text-xs text-muted-foreground">Judge spread: {c.spread} pts</span>
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${ok ? "border-gain/50 text-gain" : "border-primary/60 text-primary"}`}><ShieldCheck className="h-3.5 w-3.5" />{label}</span>;
}

function ScoreMatrix({ e }: { e: { prompt_text: string; candidate_output: string; individual_scores: unknown; consensus_score: number | null; bias_mitigation_meta: unknown } }) {
  const scores = (e.individual_scores as JudgeScore[]) ?? [];
  const meta = (e.bias_mitigation_meta as { position_swap_verified?: boolean; length_penalty_applied?: boolean }) ?? {};
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{e.prompt_text}</p>
      <div className="flex flex-wrap gap-2"><Badge ok={!!meta.position_swap_verified} label={meta.position_swap_verified ? "Position swap verified" : "Swap not verified"} /><Badge ok={!meta.length_penalty_applied} label={meta.length_penalty_applied ? "Length penalty applied" : "No length penalty"} /></div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground"><tr className="border-b"><th className="py-2">Judge</th><th>Score</th><th>Verdict</th></tr></thead>
        <tbody>{scores.map((s) => <tr key={s.judge} className="border-b align-top last:border-0"><td className="py-2 pr-2">{nameOf(s.judge)}</td><td className="pr-2 font-mono text-primary">{s.score}</td><td className="text-muted-foreground">{s.verdict}</td></tr>)}</tbody>
        <tfoot><tr><td className="pt-2 font-medium">Consensus</td><td className="pt-2 font-mono font-semibold">{Number(e.consensus_score ?? 0).toFixed(1)}</td><td /></tr></tfoot>
      </table>
      <details><summary className="cursor-pointer text-xs text-muted-foreground">Reasoning chains</summary>
        <div className="mt-2 space-y-3">{scores.map((s) => <div key={s.judge}><div className="text-xs font-medium">{nameOf(s.judge)}</div><ol className="ml-4 list-decimal text-xs text-muted-foreground">{s.reasoning.map((r, i) => <li key={i}>{r}</li>)}</ol></div>)}</div>
      </details>
    </div>
  );
}

function JobsPanel({ signedIn, start }: { signedIn: boolean; start: (m: string, p: number, c: number) => Promise<void> }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [model, setModel] = useState<string>(CANDIDATES[2].id);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    supabase.from("eval_execution_jobs").select("*").order("created_at", { ascending: false }).limit(60).then(({ data }) => setJobs(data ?? []));
    const ch = supabase.channel("jobs").on("postgres_changes", { event: "*", schema: "public", table: "eval_execution_jobs" }, (p) => {
      const row = p.new as Job;
      setJobs((js) => [row, ...js.filter((j) => j.id !== row.id)].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 60));
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  const tone: Record<string, string> = { queued: "text-muted-foreground", running: "text-speed", completed: "text-gain", failed: "text-loss" };
  const tel = (j: Job) => j.raw_telemetry as { p50_ttft_ms?: number; p99_ttft_ms?: number; median_tps?: number; token_variance?: number };

  return (
    <Panel title="Autonomous benchmark jobs" sub="Live progress for every run. Starting a job sends real probe prompts and measures response time.">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={model} onValueChange={setModel}><SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger><SelectContent>{CANDIDATES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent></Select>
        {signedIn ? <button disabled={running} onClick={async () => { setRunning(true); await start(model, 6, 2); setRunning(false); }} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Run 6-prompt probe</button>
          : <Link to="/auth" search={{ next: "/evals/judge-arena" }} className="rounded-md border px-3 py-2 text-sm">Sign in to start a job</Link>}
        <button onClick={() => download("genri-jobs.csv", toCsv(jobs.map((j) => ({ id: j.id, model: j.model_id, suite: j.suite_name, status: j.status, completed: j.completed_prompts, total: j.total_prompts, ...tel(j), started_at: j.started_at, completed_at: j.completed_at }))), "text/csv")} className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent"><Download className="h-3.5 w-3.5" />CSV</button>
        <button onClick={() => download("genri-jobs-telemetry.json", JSON.stringify(jobs, null, 2))} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent"><Download className="h-3.5 w-3.5" />JSON</button>
      </div>
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full min-w-[720px] font-mono text-xs tabular">
          <thead className="sticky top-0 bg-card text-left text-muted-foreground"><tr className="border-b"><th className="py-2 font-sans">Model</th><th>Suite</th><th>Status</th><th className="w-40">Progress</th><th>p50 TTFT</th><th>p99 TTFT</th><th>TPS</th><th>Conc.</th></tr></thead>
          <tbody>{jobs.map((j) => {
            const t = tel(j); const pctDone = j.total_prompts ? (j.completed_prompts / j.total_prompts) * 100 : 0;
            return (
              <tr key={j.id} className="border-b last:border-0">
                <td className="py-2 font-sans">{nameOf(j.model_id)}</td><td>{j.suite_name}</td>
                <td className={tone[j.status]}>{j.status}</td>
                <td><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-muted"><div className={`h-full rounded-full transition-all duration-500 ${j.status === "failed" ? "bg-loss" : "bg-gradient-speed"}`} style={{ width: `${pctDone}%` }} /></div><span>{j.completed_prompts}/{j.total_prompts}</span></div></td>
                <td>{t.p50_ttft_ms ? `${t.p50_ttft_ms}ms` : "—"}</td><td>{t.p99_ttft_ms ? `${t.p99_ttft_ms}ms` : "—"}</td><td>{t.median_tps ?? "—"}</td><td>{j.concurrency}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </Panel>
  );
}
