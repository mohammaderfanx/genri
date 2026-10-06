import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, LabelList } from "recharts";
import { models, isImage } from "@/lib/models";
import { Slider } from "@/components/ui/slider";
import { PageTitle, Panel } from "@/components/SiteHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/router-calculator")({
  validateSearch: z.object({ tokens: z.number().optional() }),
  head: () => ({
    meta: [
      { title: "LLM Cost & ROI Router Calculator — Genri AI" },
      { name: "description", content: "Estimate monthly LLM spend, compare proprietary vs open-weights hosting and build fallback routing chains with exportable code." },
      { property: "og:title", content: "LLM Cost & Routing Calculator — Genri AI" },
      { property: "og:description", content: "Workload estimator, cost vs quality matrix and fallback chain builder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RouterCalc,
});

const llms = models.filter((m) => !isImage(m));
type Domain = "Coding" | "RAG" | "General";
const domainKey: Record<Domain, "Coding" | "Long Context" | "Instruction"> = { Coding: "Coding", RAG: "Long Context", General: "Instruction" };
type Rule = { slug: string; when: "always" | "ttft" | "simple" | "error"; value: number };
const whenLabel = { always: "Primary", ttft: "If TTFT >", simple: "For simple prompts", error: "On error / 429" };

function RouterCalc() {
  const { tokens } = Route.useSearch();
  const [inM, setIn] = useState(tokens ?? 20);
  const [outM, setOut] = useState(Math.max(1, Math.round((tokens ?? 20) / 4)));
  const [latency, setLatency] = useState(1000);
  const [domain, setDomain] = useState<Domain>("Coding");
  const [rules, setRules] = useState<Rule[]>([
    { slug: "deepseek-r1", when: "always", value: 0 },
    { slug: "claude-3-5-sonnet", when: "ttft", value: 400 },
    { slug: "llama-3-3-70b", when: "simple", value: 0 },
  ]);
  const [lang, setLang] = useState<"ts" | "py">("ts");

  const rows = useMemo(() => llms.map((m) => {
    const cheapest = [...m.hosts].sort((a, b) => a.price - b.price)[0]!;
    const fastestTTFT = Math.min(...m.hosts.map((h) => h.ttft));
    const monthly = (inM * m.pricing.input + outM * m.pricing.output) * 30;
    return { name: m.name, slug: m.slug, monthly: Math.round(monthly), quality: m.domains[domainKey[domain]], ttft: fastestTTFT, host: cheapest.host, open: m.license !== "Proprietary API", ok: fastestTTFT <= latency };
  }).sort((a, b) => b.quality / Math.max(1, b.monthly) - a.quality / Math.max(1, a.monthly)), [inM, outM, latency, domain]);

  const best = rows.filter((r) => r.ok).sort((a, b) => b.quality - a.quality || a.monthly - b.monthly)[0];
  const name = (s: string) => models.find((m) => m.slug === s)!.name;

  const code = lang === "ts" ? `import { generateText } from "ai";
import { genri } from "@genri/ai-sdk-provider";

const chain = [
${rules.map((r) => `  { model: genri("${r.slug}"), when: ${r.when === "ttft" ? `{ ttftAboveMs: ${r.value} }` : `"${r.when}"`} },`).join("\n")}
];

export async function route(prompt: string) {
  return generateText({ model: genri.router(chain), prompt });
}` : `from litellm import Router

router = Router(
    model_list=[
${rules.map((r) => `        {"model_name": "${r.slug}", "litellm_params": {"model": "genri/${r.slug}"}},`).join("\n")}
    ],
    fallbacks=[{"${rules[0]?.slug}": [${rules.slice(1).map((r) => `"${r.slug}"`).join(", ")}]}],
    routing_strategy="latency-based-routing",
)

resp = router.completion(model="${rules[0]?.slug}", messages=[{"role": "user", "content": prompt}])`;

  const slider = (label: string, v: number, set: (n: number) => void, min: number, max: number, step: number, fmt: (n: number) => string) => (
    <div>
      <div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className="font-mono text-primary tabular">{fmt(v)}</span></div>
      <Slider value={[v]} min={min} max={max} step={step} onValueChange={(x) => set(x[0]!)} />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-10">
      <PageTitle eyebrow="ROI Router" title="What will this workload cost?" sub="Tune your daily volume and latency target, then build a fallback chain." />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Panel title="Workload">
          <div className="space-y-6">
            {slider("Daily input tokens", inM, setIn, 1, 500, 1, (n) => `${n}M`)}
            {slider("Daily output tokens", outM, setOut, 1, 200, 1, (n) => `${n}M`)}
            {slider("Latency target (TTFT <)", latency, setLatency, 100, 5000, 50, (n) => `${n}ms`)}
            <div>
              <div className="mb-2 text-sm text-muted-foreground">Domain priority</div>
              <div className="flex rounded-md border p-0.5 text-sm">{(["Coding", "RAG", "General"] as Domain[]).map((d) => <button key={d} onClick={() => setDomain(d)} className={`flex-1 rounded py-1 ${domain === d ? "bg-secondary" : "text-muted-foreground"}`}>{d}</button>)}</div>
            </div>
            {best && <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">Best fit: <b>{best.name}</b> on {best.host} at <span className="font-mono">${best.monthly.toLocaleString()}/mo</span></div>}
          </div>
        </Panel>
        <Panel title="Cost vs quality" sub="Monthly cost (log) vs domain score. Faded models miss your latency target.">
          <div className="h-72">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 16, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" />
                <XAxis type="number" dataKey="monthly" scale="log" domain={["auto", "auto"]} stroke="var(--muted-foreground)" fontSize={10} tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                <YAxis type="number" dataKey="quality" domain={[70, 100]} stroke="var(--muted-foreground)" fontSize={10} />
                <ZAxis range={[110, 110]} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Scatter data={rows.filter((r) => r.ok)} fill="var(--primary)"><LabelList dataKey="name" position="top" style={{ fill: "var(--muted-foreground)", fontSize: 10 }} /></Scatter>
                <Scatter data={rows.filter((r) => !r.ok)} fill="var(--muted-foreground)" fillOpacity={0.35} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full font-mono text-xs tabular">
              <thead className="text-left text-muted-foreground"><tr className="border-b"><th className="py-2 font-sans">Model</th><th>Type</th><th>Cheapest host</th><th>TTFT</th><th className="text-right">$/month</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.slug} className={`border-b last:border-0 ${r.ok ? "" : "opacity-40"}`}><td className="py-2 font-sans text-sm">{r.name}</td><td>{r.open ? "Open" : "API"}</td><td>{r.host}</td><td>{r.ttft}ms</td><td className="text-right">${r.monthly.toLocaleString()}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Fallback chain" sub="Requests flow top to bottom until a rule matches.">
          <ol className="space-y-2">
            {rules.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border bg-panel p-2">
                <span className="grid h-6 w-6 place-items-center rounded bg-secondary font-mono text-xs">{i + 1}</span>
                <Select value={r.when} onValueChange={(v) => setRules(rules.map((x, j) => j === i ? { ...x, when: v as Rule["when"] } : x))}>
                  <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(whenLabel).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
                {r.when === "ttft" && <input type="number" value={r.value} onChange={(e) => setRules(rules.map((x, j) => j === i ? { ...x, value: +e.target.value } : x))} className="h-8 w-20 rounded-md border bg-background px-2 font-mono text-sm" />}
                <Select value={r.slug} onValueChange={(v) => setRules(rules.map((x, j) => j === i ? { ...x, slug: v } : x))}>
                  <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{llms.map((m) => <SelectItem key={m.slug} value={m.slug}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
                <button aria-label="Remove rule" onClick={() => setRules(rules.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-loss"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ol>
          <button onClick={() => setRules([...rules, { slug: "gpt-4o", when: "error", value: 0 }])} className="mt-3 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"><Plus className="h-4 w-4" />Add fallback</button>
          <p className="mt-4 text-sm text-muted-foreground">{rules.map((r, i) => `${i === 0 ? "" : " → "}${r.when === "ttft" ? `if TTFT > ${r.value}ms: ` : r.when === "always" ? "" : `${whenLabel[r.when].toLowerCase()}: `}${name(r.slug)}`).join("")}</p>
        </Panel>
        <Panel title="Export code">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex rounded-md border p-0.5 text-sm">{(["ts", "py"] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={`rounded px-3 py-1 ${lang === l ? "bg-secondary" : "text-muted-foreground"}`}>{l === "ts" ? "TypeScript · AI SDK" : "Python · LiteLLM"}</button>)}</div>
            <button onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied"); }} className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"><Copy className="h-4 w-4" />Copy</button>
          </div>
          <pre className="overflow-x-auto rounded-lg border bg-background p-4 font-mono text-xs leading-relaxed">{code}</pre>
        </Panel>
      </div>
    </div>
  );
}
