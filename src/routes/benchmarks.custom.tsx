import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, Download, Play, FileText } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { models, isImage } from "@/lib/models";
import { PageTitle, Panel } from "@/components/SiteHeader";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/benchmarks/custom")({
  head: () => ({
    meta: [
      { title: "Custom Benchmark Suite Creator — Genri AI" },
      { name: "description", content: "Upload your own JSONL/CSV prompts, pick LLM-as-judge, similarity, exact match or regex metrics, and download a benchmark report." },
      { property: "og:title", content: "Custom Benchmarks — Genri AI" },
      { property: "og:description", content: "Evaluate AI models on your own data and export the report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Custom,
});

type Row = { system?: string; input: string; expected: string };
const sample: Row[] = [
  { system: "You are a support agent.", input: "How do I reset my password?", expected: "Settings > Security > Reset password" },
  { input: "Extract the invoice total: 'Total due: $1,240.00'", expected: "1240.00" },
  { input: "Is 2027 a leap year? Answer yes or no.", expected: "no" },
  { input: "Return the ISO country code for Germany.", expected: "DE" },
];
const metrics = ["LLM-as-a-Judge (GPT-4o)", "LLM-as-a-Judge (Claude)", "Semantic Similarity", "Exact Match", "Regex Validation"] as const;
const llms = models.filter((m) => !isImage(m));

function parse(text: string, name: string): Row[] {
  if (name.endsWith(".jsonl")) return text.split("\n").filter(Boolean).map((l) => { const o = JSON.parse(l); return { system: o.system ?? o.system_prompt, input: String(o.input ?? o.prompt), expected: String(o.expected ?? o.expected_output ?? o.ground_truth ?? "") }; });
  const [head, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const cols = head!.split(",").map((c) => c.trim().toLowerCase());
  return lines.map((l) => { const v = l.split(","); const g = (k: string) => v[cols.indexOf(k)]?.trim() ?? ""; return { system: g("system"), input: g("input") || g("prompt"), expected: g("expected") || g("expected_output") }; });
}

// Deterministic simulated score so the same dataset always yields the same report.
const score = (slug: string, metric: string, i: number) => {
  const m = models.find((x) => x.slug === slug)!;
  const h = [...(slug + metric + i)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 3);
  const base = metric.startsWith("Exact") || metric.startsWith("Regex") ? m.domains.Instruction - 10 : m.domains.Instruction;
  return Math.max(0, Math.min(100, base - 12 + (h % 24)));
};

function Custom() {
  const [rows, setRows] = useState<Row[]>(sample);
  const [file, setFile] = useState("sample.jsonl");
  const [sel, setSel] = useState<string[]>(["claude-3-5-sonnet", "gpt-4o", "llama-3-3-70b"]);
  const [metric, setMetric] = useState<string>(metrics[0]);
  const [regex, setRegex] = useState("^\\d+(\\.\\d+)?$");
  const [result, setResult] = useState<{ name: string; slug: string; score: number; per: number[] }[] | null>(null);
  const [running, setRunning] = useState(false);

  const onFile = async (f?: File) => {
    if (!f) return;
    try { const r = parse(await f.text(), f.name); if (!r.length) throw new Error(); setRows(r); setFile(f.name); setResult(null); toast.success(`Loaded ${r.length} prompts`); }
    catch { toast.error("Couldn't read that file. Use JSONL or CSV with input and expected columns."); }
  };

  const run = () => {
    setRunning(true); setResult(null);
    setTimeout(() => {
      setResult(sel.map((s) => { const per = rows.map((_, i) => score(s, metric, i)); return { name: models.find((m) => m.slug === s)!.name, slug: s, per, score: Math.round(per.reduce((a, b) => a + b, 0) / per.length) }; }).sort((a, b) => b.score - a.score));
      setRunning(false);
    }, 1200);
  };

  const download = () => {
    const report = { dataset: file, metric, regex: metric.startsWith("Regex") ? regex : undefined, generatedAt: new Date().toISOString(), prompts: rows.length, results: result };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "genri-benchmark-report.json"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-10">
      <PageTitle eyebrow="Custom benchmarks" title="Benchmark models on your own data" sub="Upload prompts with expected answers, pick how to grade them, and get a report." />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="Dataset" sub="JSONL or CSV with input and expected columns (system is optional).">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed bg-panel p-6 text-center text-sm text-muted-foreground hover:border-primary">
            <Upload className="h-5 w-5" /> Drop or choose a .jsonl / .csv file
            <input type="file" accept=".jsonl,.csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <div className="mt-3 flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-primary" />{file} · {rows.length} prompts</div>
          <div className="mt-3 max-h-64 overflow-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card text-left text-muted-foreground"><tr><th className="p-2">#</th><th>Input</th><th>Expected</th></tr></thead>
              <tbody>{rows.map((r, i) => <tr key={i} className="border-t"><td className="p-2 font-mono text-muted-foreground">{i + 1}</td><td className="pr-2">{r.input}</td><td className="pr-2 font-mono">{r.expected}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Configuration">
          <div className="space-y-5 text-sm">
            <div>
              <div className="mb-2 text-muted-foreground">Metric</div>
              <div className="space-y-1">{metrics.map((m) => <label key={m} className="flex cursor-pointer items-center gap-2"><input type="radio" name="metric" checked={metric === m} onChange={() => setMetric(m)} className="accent-[var(--primary)]" />{m}</label>)}</div>
              {metric.startsWith("Regex") && <input value={regex} onChange={(e) => setRegex(e.target.value)} className="mt-2 w-full rounded-md border bg-background px-2 py-1.5 font-mono text-xs" />}
            </div>
            <div>
              <div className="mb-2 text-muted-foreground">Models ({sel.length})</div>
              <div className="grid grid-cols-2 gap-1.5">{llms.map((m) => (
                <label key={m.slug} className="flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={sel.includes(m.slug)} onCheckedChange={(c) => setSel(c ? [...sel, m.slug] : sel.filter((s) => s !== m.slug))} />{m.name}</label>
              ))}</div>
            </div>
            <button disabled={!sel.length || running} onClick={run} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 font-medium text-primary-foreground disabled:opacity-50"><Play className="h-4 w-4" />{running ? "Evaluating…" : "Run evaluation"}</button>
          </div>
        </Panel>
      </div>
      {result && (
        <Panel title="Report" sub={`${metric} · ${rows.length} prompts · simulated scores`}>
          <div className="mb-3 flex gap-2">
            <button onClick={download} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"><Download className="h-4 w-4" />JSON</button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"><Download className="h-4 w-4" />PDF</button>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={result} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={110} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="score" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}
    </div>
  );
}
