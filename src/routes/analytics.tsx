import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart, CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, LabelList } from "recharts";
import { models, isImage } from "@/lib/models";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/analytics")({
  validateSearch: z.object({ compare: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Benchmark Matrix — Genri AI" },
      { name: "description", content: "Price vs quality and speed vs quality charts for leading AI models, plus inference host comparisons." },
      { property: "og:title", content: "Benchmark Matrix — Genri AI" },
      { property: "og:description", content: "Interactive price, speed and quality analysis across AI models and hosts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Analytics,
});

const llms = models.filter((m) => !isImage(m));
const data = llms.map((m) => ({ name: m.name, price: m.pricing.output, elo: m.scores.elo, tps: m.metrics.tps, quality: Math.round((m.scores.mmluPro + m.scores.gpqa + m.scores.humanEval + m.scores.math500) / 4), color: m.color }));

function Tip({ active, payload }: { active?: boolean; payload?: { payload: (typeof data)[number] }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 font-mono text-xs shadow-xl">
      <div className="mb-1 font-sans text-sm font-semibold">{d.name}</div>
      <div>Elo <span className="text-primary">{d.elo}</span> · Quality {d.quality}</div>
      <div>${d.price}/1M out · <span className="text-speed">{d.tps} TPS</span></div>
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{sub}</p>
      <div className="mt-4 h-80">{children}</div>
    </section>
  );
}

const axis = { stroke: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" };

const maxTps = Math.max(...llms.map((m) => m.metrics.tps));
const maxCtx = Math.log(Math.max(...llms.map((m) => m.contextWindow)));
const maxCost = Math.log(Math.max(...llms.map((m) => m.pricing.blended)) + 1);
const vec = (m: (typeof llms)[number]) => ({
  Reasoning: m.domains.Logic, Coding: m.domains.Coding, "Instruction Following": m.domains.Instruction,
  "Speed/TPS": Math.round((m.metrics.tps / maxTps) * 100), "Context Efficiency": Math.round((Math.log(m.contextWindow) / maxCtx) * 100),
  "Cost Efficiency": Math.round((1 - Math.log(m.pricing.blended + 1) / maxCost) * 100),
});
const palette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

function Analytics() {
  const { compare } = Route.useSearch();
  const [cmp, setCmp] = useState<string[]>(() => (compare?.split(",").filter((s) => llms.some((m) => m.slug === s)) ?? []).slice(0, 4).concat(compare ? [] : ["claude-3-5-sonnet", "deepseek-r1", "llama-3-3-70b"]));
  const radarData = Object.keys(vec(llms[0]!)).map((axis) => Object.fromEntries([["axis", axis], ...cmp.map((s) => [s, vec(llms.find((m) => m.slug === s)!)[axis as keyof ReturnType<typeof vec>]])]));
  const [slug, setSlug] = useState("llama-3-3-70b");
  const m = models.find((x) => x.slug === slug)!;
  const best = { tps: Math.max(...m.hosts.map((h) => h.tps)), ttft: Math.min(...m.hosts.map((h) => h.ttft)), price: Math.min(...m.hosts.map((h) => h.price)) };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Benchmark Matrix</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Price, speed & quality — at a glance.</h1>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel title="Price vs Quality" sub="Output price ($/1M tokens, log) vs Arena Elo. Top-left is best value.">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid stroke="var(--border)" />
              <XAxis type="number" dataKey="price" scale="log" domain={[0.3, 80]} {...axis} tickFormatter={(v) => `$${v}`} />
              <YAxis type="number" dataKey="elo" domain={[1230, 1380]} {...axis} />
              <ZAxis range={[120, 120]} />
              <Tooltip content={<Tip />} cursor={{ stroke: "var(--border)" }} />
              <Scatter data={data} fill="var(--primary)">
                <LabelList dataKey="name" position="top" style={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Speed vs Quality" sub="Output tokens per second vs averaged benchmark quality score.">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid stroke="var(--border)" />
              <XAxis type="number" dataKey="tps" {...axis} />
              <YAxis type="number" dataKey="quality" domain={[60, 95]} {...axis} />
              <ZAxis range={[120, 120]} />
              <Tooltip content={<Tip />} cursor={{ stroke: "var(--border)" }} />
              <Scatter data={data} fill="var(--speed)">
                <LabelList dataKey="name" position="top" style={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <section className="mt-4 grid gap-4 rounded-xl border bg-card p-5 lg:grid-cols-[240px_1fr]">
        <div>
          <h2 className="font-semibold">Capability overlay</h2>
          <p className="text-sm text-muted-foreground">Pick 2–4 models.</p>
          <div className="mt-3 space-y-1.5">{llms.map((m) => (
            <label key={m.slug} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={cmp.includes(m.slug)} disabled={!cmp.includes(m.slug) && cmp.length >= 4} onCheckedChange={(c) => setCmp(c ? [...cmp, m.slug] : cmp.filter((x) => x !== m.slug))} />{m.name}
            </label>
          ))}</div>
        </div>
        <div className="h-96">
          <ResponsiveContainer>
            <RadarChart data={radarData} outerRadius="70%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {cmp.map((s, i) => <Radar key={s} dataKey={s} name={llms.find((m) => m.slug === s)!.name} stroke={palette[i]} fill={palette[i]} fillOpacity={0.15} />)}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-4 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">Inference host comparison</h2><p className="text-sm text-muted-foreground">Same model, different providers. Best values highlighted.</p></div>
          <Select value={slug} onValueChange={setSlug}>
            <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
            <SelectContent>{models.map((x) => <SelectItem key={x.slug} value={x.slug}>{x.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full font-mono text-sm tabular">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b"><th className="py-2 font-sans">Host</th><th>Throughput</th><th>TTFT</th><th>Price</th><th className="w-1/3">Speed</th></tr>
            </thead>
            <tbody>
              {m.hosts.map((h) => (
                <tr key={h.host} className="border-b last:border-0">
                  <td className="py-3 font-sans font-medium">{h.host}</td>
                  <td className={h.tps === best.tps ? "text-gain" : ""}>{h.tps} {isImage(m) ? "img/s" : "tok/s"}</td>
                  <td className={h.ttft === best.ttft ? "text-gain" : ""}>{h.ttft}ms</td>
                  <td className={h.price === best.price ? "text-gain" : ""}>${h.price}</td>
                  <td><div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-speed" style={{ width: `${(h.tps / best.tps) * 100}%` }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
