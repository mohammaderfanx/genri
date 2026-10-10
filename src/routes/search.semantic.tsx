import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Download } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { models, isImage, fmtCtx } from "@/lib/models";
import { semanticSearch } from "@/lib/semantic.functions";
import { exportChartPng } from "@/lib/exporters";
import { PageTitle, Panel, ProviderAvatar } from "@/components/SiteHeader";

export const Route = createFileRoute("/search/semantic")({
  head: () => ({
    meta: [
      { title: "Semantic AI Model Search — Genri AI" },
      { name: "description", content: "Describe what you need in plain language and find the AI model that matches on capability, price, latency and license." },
      { property: "og:title", content: "Semantic Model Search — Genri AI" },
      { property: "og:description", content: "Natural-language matching of AI models with hard price and latency filters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Semantic,
});

type Filters = { maxPrice: number | null; maxTtft: number | null; openOnly: boolean; minContext: number | null };
const examples = [
  "Open-weights model under $1/1M tokens that excels at Python async refactoring with under 200ms TTFT",
  "Best model for reading a 500-page contract and answering questions about it",
  "Cheap, fast model for high-volume customer support chat",
  "Strongest model for olympiad-level math proofs, price doesn't matter",
];

/** Pulls hard constraints out of the sentence so they are enforced as filters, not just similarity. */
function parseFilters(q: string): Filters {
  const price = q.match(/\$\s?(\d+(?:\.\d+)?)/);
  const ttft = q.match(/(\d{2,5})\s?ms/i);
  const ctx = q.match(/(\d+)\s?(k|m)\b(?:\s?tokens?)?\s?(?:context)?/i);
  return {
    maxPrice: price && /(under|below|less|max|<|cheaper)/i.test(q) ? +price[1]! : null,
    maxTtft: ttft ? +ttft[1]! : null,
    openOnly: /open[- ]?(weights?|source)|self[- ]?host/i.test(q),
    minContext: ctx && /context/i.test(q) ? +ctx[1]! * (ctx[2]!.toLowerCase() === "m" ? 1e6 : 1e3) : null,
  };
}

function Semantic() {
  const search = useServerFn(semanticSearch);
  const [q, setQ] = useState(examples[0]!);
  const [f, setF] = useState<Filters>(parseFilters(examples[0]!));
  const [res, setRes] = useState<{ slug: string; similarity: number }[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chart = useRef<HTMLDivElement>(null);

  const run = async (text = q) => {
    setBusy(true); setErr(null);
    const parsed = parseFilters(text); setF(parsed);
    const r = await search({ data: { query: text } });
    setBusy(false);
    if (r.error) setErr(r.error);
    setRes(r.matches);
  };

  const ranked = (res ?? []).map((r) => {
    const m = models.find((x) => x.slug === r.slug)!;
    const ttft = Math.min(...m.hosts.map((h) => h.ttft));
    const cost = f.maxPrice ? Math.max(0, Math.min(1, f.maxPrice / Math.max(0.01, m.pricing.blended))) : 1 - Math.min(1, m.pricing.blended / 30);
    const lat = f.maxTtft ? Math.max(0, Math.min(1, f.maxTtft / ttft)) : 1 - Math.min(1, ttft / 10000);
    const lic = f.openOnly ? (m.license !== "Proprietary API" ? 1 : 0) : 1;
    const cap = Math.max(0, Math.min(1, (r.similarity - 0.2) / 0.45));
    const passes = (!f.maxPrice || m.pricing.blended <= f.maxPrice) && (!f.maxTtft || ttft <= f.maxTtft) && (!f.openOnly || m.license !== "Proprietary API") && (!f.minContext || m.contextWindow >= f.minContext);
    const score = Math.round((cap * 0.55 + cost * 0.15 + lat * 0.15 + lic * 0.15) * 100);
    return { m, ttft, passes, score, dims: { Capability: Math.round(cap * 100), Cost: Math.round(cost * 100), Latency: Math.round(lat * 100), License: Math.round(lic * 100) } };
  }).sort((a, b) => Number(b.passes) - Number(a.passes) || b.score - a.score);
  const top = ranked.filter((r) => !isImage(r.m)).slice(0, 3);
  const radar = ["Capability", "Cost", "Latency", "License"].map((k) => Object.fromEntries([["axis", k], ...top.map((t) => [t.m.slug, t.dims[k as keyof typeof t.dims]])]));
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

  const chip = (label: string, on: boolean, clear: () => void) => on && <button onClick={clear} className="rounded-full border border-primary/50 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">{label} ×</button>;

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-10">
      <PageTitle eyebrow="Semantic search" title="Describe the model you need" sub="Your sentence is matched by meaning against each model's strengths. Prices, speeds and license limits in it are applied as hard filters." />
      <div className="rounded-xl border bg-card p-4">
        <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2} className="w-full resize-none bg-transparent text-base outline-none" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chip(`≤ $${f.maxPrice}/1M`, !!f.maxPrice, () => setF({ ...f, maxPrice: null }))}
          {chip(`TTFT ≤ ${f.maxTtft}ms`, !!f.maxTtft, () => setF({ ...f, maxTtft: null }))}
          {chip("Open weights", f.openOnly, () => setF({ ...f, openOnly: false }))}
          {chip(`≥ ${fmtCtx(f.minContext ?? 0)} context`, !!f.minContext, () => setF({ ...f, minContext: null }))}
          <button onClick={() => run()} disabled={busy || q.trim().length < 3} className="ml-auto inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"><Sparkles className="h-4 w-4" />{busy ? "Matching…" : "Find models"}</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{examples.map((e) => <button key={e} onClick={() => { setQ(e); run(e); }} className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground">{e}</button>)}</div>
      {err && <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">{err}</p>}

      {res && !err && (
        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <Panel title="Ranked matches" sub="Match score blends meaning (55%) with cost, latency and license fit.">
            <ol className="divide-y">
              {ranked.map(({ m, ttft, passes, score }, i) => (
                <li key={m.slug} className={`flex items-center gap-3 py-3 ${passes ? "" : "opacity-40"}`}>
                  <span className="w-5 font-mono text-xs text-muted-foreground">{i + 1}</span>
                  <ProviderAvatar name={m.provider} color={m.color} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link to="/models/$slug" params={{ slug: m.slug }} className="font-medium hover:text-primary">{m.name}</Link>
                    <div className="font-mono text-xs text-muted-foreground">${m.pricing.blended}/1M · {ttft}ms · {m.license === "Proprietary API" ? "API" : "Open"} · {fmtCtx(m.contextWindow)} ctx{passes ? "" : " · misses a filter"}</div>
                  </div>
                  <div className="w-24"><div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-signal" style={{ width: `${score}%` }} /></div></div>
                  <span className="w-8 text-right font-mono text-sm text-primary tabular">{score}</span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Match breakdown" sub="Top 3 language models.">
            <button onClick={() => exportChartPng(chart.current, "genri-match-breakdown.png")} className="mb-2 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-accent"><Download className="h-3.5 w-3.5" />PNG</button>
            <div ref={chart} className="h-80">
              <ResponsiveContainer>
                <RadarChart data={radar} outerRadius="70%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {top.map((t, i) => <Radar key={t.m.slug} dataKey={t.m.slug} name={t.m.name} stroke={colors[i]} fill={colors[i]} fillOpacity={0.15} />)}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
