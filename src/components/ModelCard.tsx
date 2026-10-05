import { Link } from "@tanstack/react-router";
import { Star, Zap, Timer } from "lucide-react";
import { type AIModel, fmtPrice, isImage } from "@/lib/models";
import { ProviderAvatar } from "./SiteHeader";

export function ModelCard({ m }: { m: AIModel }) {
  const img = isImage(m);
  return (
    <article className="group flex flex-col gap-4 rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40">
      <div className="flex items-start gap-3">
        <ProviderAvatar name={m.provider} color={m.color} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{m.name}</h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded border px-1.5 py-0.5">{m.provider}</span>
            <span>{m.license === "Proprietary API" ? "API" : "Open"}</span>
          </div>
        </div>
        <span className="flex items-center gap-1 text-sm font-medium tabular"><Star className="h-3.5 w-3.5 fill-primary text-primary" />{m.rating}</span>
      </div>
      <p className="line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
      <div className="grid grid-cols-2 gap-2 font-mono text-xs tabular">
        <span className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1.5 text-speed"><Zap className="h-3.5 w-3.5" />{img ? `${m.metrics.ttft / 1000}s / img` : `${m.metrics.tps} TPS`}</span>
        <span className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1.5 text-speed"><Timer className="h-3.5 w-3.5" />{m.metrics.ttft}ms TTFT</span>
        <span className="rounded-md bg-muted px-2 py-1.5">Elo <b className="text-primary">{m.scores.elo}</b></span>
        <span className="rounded-md bg-muted px-2 py-1.5">{img ? "Creative" : "HumanEval"} <b className="text-gain">{img ? m.domains.Creative : m.scores.humanEval}%</b></span>
        <span className="col-span-2 rounded-md bg-muted px-2 py-1.5">{fmtPrice(m)}</span>
      </div>
      <div className="mt-auto flex gap-2">
        <Link to="/arena" search={{ a: m.slug }} className="flex-1 rounded-md bg-primary py-2 text-center text-sm font-medium text-primary-foreground hover:opacity-90">Battle in Arena</Link>
        <Link to="/models/$slug" params={{ slug: m.slug }} className="flex-1 rounded-md border py-2 text-center text-sm hover:bg-accent">Details & Providers</Link>
      </div>
    </article>
  );
}
