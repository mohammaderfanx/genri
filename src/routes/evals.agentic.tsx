import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Terminal, Search, FilePen, Globe, Brain, Play, RotateCcw, Check, X } from "lucide-react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, LabelList } from "recharts";
import { agenticEvals, suites, traces, replayTask, type Suite, type StepKind } from "@/lib/agentic";
import { models } from "@/lib/models";
import { PageTitle, Panel } from "@/components/SiteHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/evals/agentic")({
  head: () => ({
    meta: [
      { title: "Agentic Evals & Tool-Use Arena — Genri AI" },
      { name: "description", content: "SWE-bench Lite, WebArena, GAIA, ToolBench and Tau-bench results with step-by-step agent execution replays." },
      { property: "og:title", content: "Agentic Evals — Genri AI" },
      { property: "og:description", content: "Compare how AI agents solve real tasks, step by step, and what each success costs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Agentic,
});

const icons: Record<StepKind, typeof Terminal> = { bash: Terminal, search: Search, edit: FilePen, browse: Globe, think: Brain };
const traceModels = Object.keys(traces);
const nameOf = (s: string) => models.find((m) => m.slug === s)!.name;

function Agentic() {
  const [suite, setSuite] = useState<Suite>("SWE-bench Lite");
  const [a, setA] = useState("claude-3-5-sonnet");
  const [b, setB] = useState("gpt-4o");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const maxSteps = Math.max(traces[a]!.length, traces[b]!.length);

  useEffect(() => {
    if (!playing) return;
    if (step >= maxSteps) { setPlaying(false); return; }
    const t = setTimeout(() => setStep((s) => s + 1), 700);
    return () => clearTimeout(t);
  }, [playing, step, maxSteps]);

  const data = agenticEvals.filter((e) => e.suite === suite).map((e) => ({ ...e, costPerSuccess: +(e.cost / (e.pass / 100)).toFixed(3) }));
  const ranked = [...data].sort((x, y) => y.pass - x.pass);

  const Lane = ({ slug }: { slug: string }) => {
    const tr = traces[slug]!;
    const shown = tr.slice(0, step);
    const done = step >= tr.length;
    const solved = tr[tr.length - 1]!.ok;
    return (
      <div className="rounded-lg border bg-panel p-3">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium">{nameOf(slug)}</span>
          {done && <span className={`font-mono text-xs ${solved ? "text-gain" : "text-loss"}`}>{solved ? "RESOLVED" : "FAILED"} · {tr.length} steps · {(tr.reduce((s, x) => s + x.ms, 0) / 1000).toFixed(1)}s</span>}
        </div>
        <ol className="relative space-y-2 border-l pl-4">
          {shown.map((s, i) => {
            const I = icons[s.kind];
            return (
              <li key={i} className="animate-rise">
                <span className={`absolute -left-[9px] grid h-4 w-4 place-items-center rounded-full border bg-background ${s.ok ? "text-gain" : "text-loss"}`}>{s.ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}</span>
                <div className="flex items-center gap-2 font-mono text-xs"><I className="h-3.5 w-3.5 text-speed" /><span>{s.label}</span><span className="ml-auto text-muted-foreground">{s.ms}ms</span></div>
                <p className="mt-0.5 rounded bg-background px-2 py-1 font-mono text-[11px] text-muted-foreground">{s.detail}</p>
              </li>
            );
          })}
          {shown.length === 0 && <li className="text-xs text-muted-foreground">Press play to replay.</li>}
        </ol>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-10">
      <PageTitle eyebrow="Agentic evals" title="How agents actually solve tasks" sub="Pass@1, tool usage and cost per task across five agent benchmarks." />
      <div className="flex flex-wrap gap-2">
        {suites.map((s) => <button key={s} onClick={() => setSuite(s)} className={`rounded-full border px-3 py-1 text-sm ${suite === s ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{s}</button>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Panel title="Cost to success" sub="USD per task vs Pass@1. Top-left is the sweet spot.">
          <div className="h-72">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 16, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" />
                <XAxis type="number" dataKey="cost" scale="log" domain={["auto", "auto"]} stroke="var(--muted-foreground)" fontSize={10} tickFormatter={(v) => `$${v}`} />
                <YAxis type="number" dataKey="pass" stroke="var(--muted-foreground)" fontSize={10} unit="%" />
                <ZAxis range={[110, 110]} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Scatter data={data} fill="var(--gain)"><LabelList dataKey="model" position="top" style={{ fill: "var(--muted-foreground)", fontSize: 10 }} /></Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title={`${suite} leaderboard`}>
          <table className="w-full font-mono text-xs tabular">
            <thead className="text-left text-muted-foreground"><tr className="border-b"><th className="py-2 font-sans">Model</th><th>Pass@1</th><th>Tools</th><th className="text-right">$/success</th></tr></thead>
            <tbody>{ranked.map((e) => (
              <tr key={e.slug} className="border-b last:border-0"><td className="py-2 font-sans text-sm">{e.model}</td><td className="text-primary">{e.pass}%</td><td>{e.toolCalls}</td><td className="text-right">${e.costPerSuccess}</td></tr>
            ))}</tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Execution replay" sub={replayTask}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[[a, setA], [b, setB]].map(([v, set], i) => (
            <Select key={i} value={v as string} onValueChange={(x) => { (set as (s: string) => void)(x); setStep(0); setPlaying(false); }}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>{traceModels.map((s) => <SelectItem key={s} value={s}>{nameOf(s)}</SelectItem>)}</SelectContent>
            </Select>
          ))}
          <button onClick={() => { if (step >= maxSteps) setStep(0); setPlaying(true); }} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><Play className="h-4 w-4" />Play</button>
          <button onClick={() => { setStep(0); setPlaying(false); }} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm"><RotateCcw className="h-4 w-4" />Reset</button>
          <span className="ml-auto font-mono text-xs text-muted-foreground">step {Math.min(step, maxSteps)}/{maxSteps}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2"><Lane slug={a} /><Lane slug={b} /></div>
      </Panel>
    </div>
  );
}
