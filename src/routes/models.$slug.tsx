import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Star, ThumbsUp } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { getModel, fmtCtx, fmtPrice, isImage } from "@/lib/models";
import { ProviderAvatar } from "@/components/SiteHeader";

export const Route = createFileRoute("/models/$slug")({
  loader: ({ params }) => {
    const model = getModel(params.slug);
    if (!model) throw notFound();
    return { model };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Model not found — Genri AI" }, { name: "robots", content: "noindex" }] };
    const m = loaderData.model;
    const t = `${m.name} by ${m.provider} — Benchmarks & Reviews | Genri AI`;
    return { meta: [
      { title: t }, { name: "description", content: m.description },
      { property: "og:title", content: t }, { property: "og:description", content: m.description },
      { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary_large_image" },
    ] };
  },
  notFoundComponent: () => (
    <div className="py-32 text-center"><h1 className="text-2xl font-semibold">Model not found</h1><Link to="/" className="mt-4 inline-block text-primary">Back to store</Link></div>
  ),
  errorComponent: () => <div className="py-32 text-center">This model couldn't load.</div>,
  component: Detail,
});

const domainTags = ["All", "Coding & Debugging", "Math & Logic", "Agentic Workflows", "Creative Writing", "RAG & Long Context"];
const sampleReviews = [
  { user: "kpatel", rating: 5, domain: "Coding & Debugging", text: "Handles multi-file refactors without losing track of types. My default for PR reviews.", up: 128 },
  { user: "lena.ml", rating: 4, domain: "RAG & Long Context", text: "Retrieval grounding is solid, occasional over-summarizing on very long docs.", up: 64 },
  { user: "quantdev", rating: 5, domain: "Math & Logic", text: "Step-by-step derivations are clean and checkable. Rarely hallucinates constants.", up: 51 },
  { user: "agentsmith", rating: 4, domain: "Agentic Workflows", text: "Tool calling is reliable; latency adds up in long agent loops though.", up: 37 },
  { user: "inkwell", rating: 5, domain: "Creative Writing", text: "Voice consistency across long pieces is excellent.", up: 22 },
];

function Detail() {
  const { model: m } = Route.useLoaderData();
  const [tag, setTag] = useState("All");
  const [ups, setUps] = useState<Record<number, boolean>>({});
  const img = isImage(m);
  const radar = Object.entries(m.domains).filter(([, v]) => v > 0).map(([k, v]) => ({ k, v }));
  const total = m.ratingDist.reduce((a, b) => a + b, 0);
  const reviews = sampleReviews.filter((r) => tag === "All" || r.domain === tag);

  const specs: [string, string][] = [
    ["Context window", img ? `${m.contextWindow} prompt tokens` : `${fmtCtx(m.contextWindow)} tokens`],
    ["Released", m.released], ["License", m.license], ["Architecture", m.architecture],
    ["Pricing", img ? fmtPrice(m) : `$${m.pricing.input} in / $${m.pricing.output} out per 1M`],
    ["TTFT", `${m.metrics.ttft} ms`], ["Throughput", img ? `${m.metrics.tps} img/s` : `${m.metrics.tps} tok/s`], ["P95 latency", `${m.metrics.p95} ms`],
  ];
  const benches: [string, number][] = img ? [] : [["MMLU-Pro", m.scores.mmluPro], ["HumanEval", m.scores.humanEval], ["GPQA", m.scores.gpqa], ["MATH-500", m.scores.math500]];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-5">
        <ProviderAvatar name={m.provider} color={m.color} size={72} />
        <div className="flex-1">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">{m.provider} · {m.category}</p>
          <h1 className="text-4xl font-semibold tracking-tight">{m.name}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">{m.description}</p>
        </div>
        <div className="text-right"><div className="font-mono text-4xl font-semibold text-primary tabular">{m.scores.elo}</div><div className="text-xs text-muted-foreground">Arena Elo</div></div>
        <Link to="/arena" search={{ a: m.slug }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Battle in Arena</Link>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 lg:col-span-2">
          <h2 className="font-semibold">Spec sheet</h2>
          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4">
            {specs.map(([k, v]) => <div key={k} className="bg-card p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 font-mono text-sm tabular">{v}</dd></div>)}
          </dl>
          {benches.length > 0 && (
            <div className="mt-6 space-y-3">
              {benches.map(([k, v]) => (
                <div key={k} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-muted-foreground">{k}</span>
                  <div className="h-2 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-signal" style={{ width: `${v}%` }} /></div>
                  <span className="w-10 text-right font-mono tabular">{v}%</span>
                </div>
              ))}
            </div>
          )}
          <h3 className="mt-8 text-sm font-semibold">Available hosts</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {m.hosts.map((h) => <span key={h.host} className="rounded-md border px-2.5 py-1 font-mono text-xs">{h.host} · {h.tps} {img ? "img/s" : "TPS"} · ${h.price}</span>)}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Domain evaluation</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="k" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6 }} />
                <Radar dataKey="v" name="Score" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="mt-4 grid gap-6 rounded-xl border bg-card p-5 lg:grid-cols-[260px_1fr]">
        <div>
          <div className="font-mono text-5xl font-semibold tabular">{m.rating}</div>
          <div className="mt-1 flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-4 w-4 ${i <= Math.round(m.rating) ? "fill-primary text-primary" : "text-muted-foreground"}`} />)}</div>
          <p className="mt-1 text-sm text-muted-foreground">{m.reviews.toLocaleString()} reviews</p>
          <div className="mt-4 space-y-1.5">
            {m.ratingDist.map((n, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-3">{5 - i}</span>
                <div className="h-1.5 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(n / total) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            {domainTags.map((t) => <button key={t} onClick={() => setTag(t)} className={`rounded-full border px-3 py-1 text-xs ${tag === t ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t}</button>)}
          </div>
          <ul className="mt-4 divide-y">
            {reviews.map((r) => {
              const i = sampleReviews.indexOf(r);
              return (
                <li key={i} className="py-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">@{r.user}</span>
                    <span className="flex">{Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="h-3 w-3 fill-primary text-primary" />)}</span>
                    <span className="rounded border px-1.5 text-xs text-muted-foreground">{r.domain}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{r.text}</p>
                  <button onClick={() => setUps({ ...ups, [i]: !ups[i] })} className={`mt-2 inline-flex items-center gap-1 text-xs ${ups[i] ? "text-primary" : "text-muted-foreground"}`}><ThumbsUp className="h-3 w-3" />{r.up + (ups[i] ? 1 : 0)}</button>
                </li>
              );
            })}
            {reviews.length === 0 && <li className="py-8 text-sm text-muted-foreground">No reviews in this domain yet.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
