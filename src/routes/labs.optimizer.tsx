import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, Copy, Play, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phase4Shell, MetricStrip, DemoBadge, ExportJson } from "@/components/Phase4Shell";
import { optimizationTemplates, phase4Head } from "@/lib/phase4";
import { models } from "@/lib/models";
import type { compactPrompt } from "@/lib/optimizer-core";

export const Route = createFileRoute("/labs/optimizer")({ head: () => phase4Head("Prompt Optimizer", "Compact prompts locally, inspect token savings and compare sample quality-retention metrics."), component: Optimizer });
function Optimizer() {
  const initial = optimizationTemplates[0];
  const [text, setText] = useState(initial?.original ?? "");
  const [template, setTemplate] = useState(initial?.id ?? "");
  const [model, setModel] = useState("llama-3-3-70b");
  const [result, setResult] = useState<ReturnType<typeof compactPrompt> | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [price, setPrice] = useState(0.23);
  const [quality, setQuality] = useState(0.95);
  const [target, setTarget] = useState(150);
  const [tuned, setTuned] = useState(false);
  const worker = useRef<Worker | null>(null);
  const requestId = useRef(0);
  useEffect(() => {
    const w = new Worker(new URL("../lib/optimizer.worker.ts", import.meta.url), { type: "module" }); worker.current = w;
    setReady(true);
    w.onmessage = (event) => { if (event.data.id !== requestId.current) return; setBusy(false); if (event.data.error) toast.error(event.data.error); else setResult(event.data.result); };
    w.onerror = () => { setBusy(false); toast.error("Local prompt processing failed."); };
    return () => { w.terminate(); worker.current = null; };
  }, []);
  const selected = optimizationTemplates.find((t) => t.id === template);
  const compact = () => { if (!worker.current || !text.trim()) return; setBusy(true); setTuned(false); worker.current.postMessage({ id: ++requestId.current, text }); };
  const reset = (value: string) => { ++requestId.current; setBusy(false); setText(value); setResult(null); setTuned(false); };
  const report = { mode: "local-exact-line-deduplication", tokenizer: "cl100k_base estimate; target tokenizer may differ", original: text, ...result, qualityRetention: null, latencyDeltaMs: null };
  return <Phase4Shell title="Prompt & context optimizer" label="01 / inference efficiency" action={<DemoBadge>LOCAL PROCESSING</DemoBadge>}>
    <MetricStrip metrics={[{ label: "Input tokens", value: result?.before ?? "—", detail: "cl100k_base tokenizer" }, { label: "Token reduction", value: result ? `${result.reduction.toFixed(1)}%` : "—", tone: "text-gain", detail: result ? `${result.after} tokens after compression` : "Exact repeated-line removal" }, { label: "Savings / 1M requests", value: result ? `$${((result.before - result.after) * price).toFixed(2)}` : "—", detail: `At $${price}/1M input tokens` }, { label: "Quality retention", value: "Unmeasured", detail: "No live judge executed", tone: "text-muted-foreground" }]} />
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-5 lg:border-r lg:pr-5"><h2 className="text-sm font-semibold">Prompt library <span className="font-mono text-muted-foreground">/ 10</span></h2><div className="space-y-1">{optimizationTemplates.map((t) => <Button key={t.id} variant={template === t.id ? "secondary" : "ghost"} className="h-auto w-full justify-start whitespace-normal py-2.5 text-left" onClick={() => { setTemplate(t.id); reset(t.original); }}><span><span className="block text-xs">{t.name}</span><span className="block text-[10px] text-muted-foreground">{t.domain}</span></span></Button>)}</div><div className="border-t pt-4"><DemoBadge>ILLUSTRATIVE METRICS</DemoBadge><p className="mt-3 font-mono text-xs text-muted-foreground">Sample retention: {selected ? `${(selected.sampleRetention * 100).toFixed(0)}%` : "—"}<br />Sample latency Δ: {selected?.sampleLatencyDelta ?? "—"} ms</p></div></aside>
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Prompt workspace</h2><div className="flex gap-2"><Button size="sm" variant="outline" asChild><label className="cursor-pointer"><Upload />Import text<input className="hidden" type="file" accept=".txt,.md" aria-label="Import prompt" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 250000) { toast.error("Maximum prompt file size is 250 KB."); return; } reset(await f.text()); setTemplate(""); }} /></label></Button><Button size="icon" variant="ghost" title="Reset prompt" aria-label="Reset prompt" onClick={() => reset(selected?.original ?? "")}><RotateCcw /></Button></div></div>
        <Textarea aria-label="Original prompt" value={text} maxLength={250000} onChange={(e) => { reset(e.target.value); setTemplate(""); }} className="min-h-56 font-mono text-xs leading-6" />
        <div className="flex flex-wrap items-end gap-4"><label className="text-xs text-muted-foreground">Target model<select aria-label="Target model" value={model} onChange={(e) => { setModel(e.target.value); const m = models.find((x) => x.slug === e.target.value); if (m) setPrice(m.pricing.input); }} className="mt-1 block h-9 max-w-full rounded-md border bg-background px-3 text-foreground">{models.filter((m) => m.category !== "Image Generation").map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}</select></label><label className="text-xs text-muted-foreground">Input price / 1M<Input aria-label="Input price per million tokens" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))} className="mt-1 w-32" /></label><Button disabled={!ready || !text.trim() || busy} onClick={compact}><Play />{busy ? "Compacting…" : "Compact locally"}</Button></div>
        {result && <section className="border-t pt-5"><div className="mb-3 flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Compression diff</h2><div className="flex gap-2"><Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(result.optimized); toast.success("Optimized prompt copied"); }}><Copy />Copy</Button><ExportJson name="genri-optimized-prompt.json" value={report} /></div></div><div className="grid gap-4 md:grid-cols-2"><div className="min-w-0 rounded-md border"><div className="border-b px-3 py-2 text-xs text-muted-foreground">ORIGINAL · {result.before} tokens</div><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-6">{result.diff.filter((p) => !p.added).map((p, i) => <span key={i} className={p.removed ? "bg-loss/10 text-loss" : "text-muted-foreground"}>{p.value}</span>)}</pre></div><div className="min-w-0 rounded-md border"><div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-gain"><ArrowDown className="h-3 w-3" />COMPACTED · {result.after} tokens</div><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-6 text-gain">{result.optimized}</pre></div></div></section>}
        <section className="border-t pt-5"><div className="mb-4 flex items-center gap-3"><h2 className="font-semibold">Auto-tuner</h2><DemoBadge>SIMULATION</DemoBadge></div><div className="flex flex-wrap items-end gap-4"><label className="text-xs text-muted-foreground">TTFT target (ms)<Input aria-label="Target TTFT" type="number" min="1" value={target} onChange={(e) => setTarget(Math.max(1, Number(e.target.value)))} className="mt-1 w-32" /></label><label className="text-xs text-muted-foreground">Quality floor<Input aria-label="Quality floor" type="number" min="0" max="1" step="0.01" value={quality} onChange={(e) => setQuality(Math.max(0, Math.min(1, Number(e.target.value))))} className="mt-1 w-32" /></label><Button variant="outline" onClick={() => setTuned(true)}><Play />Simulate candidates</Button></div>{tuned && <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-muted-foreground"><tr><th className="py-2">Candidate</th><th>Sample TTFT</th><th>Sample quality</th><th>Thresholds</th></tr></thead><tbody>{models.filter((m) => m.category !== "Image Generation").slice(0, 7).map((m, i) => { const q = 0.94 + i % 5 / 100; return <tr key={m.slug} className="border-t"><td className="py-3">{m.name}</td><td className="font-mono">{m.metrics.ttft} ms</td><td className="font-mono">{q.toFixed(2)}</td><td className={m.metrics.ttft < target && q >= quality ? "text-gain" : "text-loss"}>{m.metrics.ttft < target && q >= quality ? "Within target" : "Outside target"}</td></tr>; })}</tbody></table></div>}</section>
      </div>
    </div>
  </Phase4Shell>;
}