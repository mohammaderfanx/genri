import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Trophy, Zap, Brain } from "lucide-react";
import { models, type AIModel } from "@/lib/models";
import { ModelCard } from "@/components/ModelCard";
import { ProviderAvatar } from "@/components/SiteHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Genri AI — The Unified AI Discovery Engine" },
      { name: "description", content: "Discover, benchmark and compare AI models: Elo, speed, latency and price for LLMs, image and multimodal AI." },
      { property: "og:title", content: "Genri AI — The Unified AI Discovery Engine" },
      { property: "og:description", content: "The App Store and benchmarking arena for AI models." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const cats = [
  ["All", null], ["Text", "Text & Chat"], ["Code", "Code"], ["Image", "Image Generation"], ["Multimodal", "Multimodal"], ["Reasoning", "Reasoning"],
] as const;
const sorts: Record<string, (a: AIModel, b: AIModel) => number> = {
  elo: (a, b) => b.scores.elo - a.scores.elo,
  ttft: (a, b) => a.metrics.ttft - b.metrics.ttft,
  price: (a, b) => a.pricing.blended - b.pricing.blended,
  rating: (a, b) => b.rating - a.rating,
};

function Spotlight({ m, label, icon: Icon, gradient, stat }: { m: AIModel; label: string; icon: typeof Trophy; gradient: string; stat: string }) {
  return (
    <Link to="/models/$slug" params={{ slug: m.slug }} className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40">
      <div className={`absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20 blur-3xl ${gradient}`} />
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-6 flex items-center gap-3">
        <ProviderAvatar name={m.provider} color={m.color} size={48} />
        <div><div className="text-xl font-semibold">{m.name}</div><div className="text-sm text-muted-foreground">{m.provider}</div></div>
      </div>
      <div className="mt-6 font-mono text-3xl font-semibold tabular">{stat}</div>
    </Link>
  );
}

function Index() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [lic, setLic] = useState<"all" | "prop" | "open">("all");
  const [sort, setSort] = useState("elo");

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return models
      .filter((m) => !cat || m.category === cat)
      .filter((m) => lic === "all" || (lic === "prop" ? m.license === "Proprietary API" : m.license !== "Proprietary API"))
      .filter((m) => !s || `${m.name} ${m.provider} ${m.category} ${m.description}`.toLowerCase().includes(s))
      .sort(sorts[sort]);
  }, [q, cat, lic, sort]);

  const llms = models.filter((m) => m.category !== "Image Generation");
  const motw = models.find((m) => m.slug === "claude-3-5-sonnet")!;
  const fastest = [...llms].sort((a, b) => b.metrics.tps - a.metrics.tps)[0];
  const openReason = [...models].filter((m) => m.license !== "Proprietary API").sort((a, b) => b.domains.Logic - a.domains.Logic)[0];

  const pill = (active: boolean) => `rounded-full border px-3 py-1 text-sm transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <div>
      <section className="relative border-b">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-16">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Live · {models.length} models tracked</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight md:text-6xl">The Unified AI Discovery Engine & <span className="text-gradient-signal">Benchmarking Arena.</span></h1>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Spotlight m={motw} label="Model of the Week" icon={Trophy} gradient="bg-gradient-signal" stat={`${motw.scores.elo} Elo`} />
            <Spotlight m={fastest} label="Highest Speed Leader" icon={Zap} gradient="bg-gradient-speed" stat={`${fastest.metrics.tps} TPS`} />
            <Spotlight m={openReason} label="Top Open Reasoning" icon={Brain} gradient="bg-gradient-open" stat={`${openReason.scores.math500}% MATH`} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models, providers, capabilities" className="w-full rounded-md border bg-panel py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex rounded-md border p-0.5 text-sm">
            {(["all", "prop", "open"] as const).map((l) => (
              <button key={l} onClick={() => setLic(l)} className={`rounded px-3 py-1 ${lic === l ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>{l === "all" ? "All" : l === "prop" ? "Proprietary" : "Open Weights"}</button>
            ))}
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full lg:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="elo">Highest Arena Elo</SelectItem>
              <SelectItem value="ttft">Lowest Latency / TTFT</SelectItem>
              <SelectItem value="price">Cheapest Token Price</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {cats.map(([label, v]) => <button key={label} onClick={() => setCat(v)} className={pill(cat === v)}>{label}</button>)}
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m, i) => <div key={m.slug} className="animate-rise" style={{ animationDelay: `${i * 30}ms` }}><ModelCard m={m} /></div>)}
        </div>
        {list.length === 0 && <p className="py-20 text-center text-muted-foreground">No models match those filters.</p>}
      </section>
    </div>
  );
}
