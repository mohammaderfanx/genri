import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, LabelList } from "recharts";
import { models, isImage } from "@/lib/models";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/analytics")({
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

function Analytics() {
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
