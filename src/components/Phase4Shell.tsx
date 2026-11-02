import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { FlaskConical, TerminalSquare, GitBranch, GitCompareArrows, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { download } from "@/lib/exporters";

const tabs = [{ to: "/labs/optimizer", name: "Optimizer", icon: FlaskConical }, { to: "/sandboxes/live", name: "Sandboxes", icon: TerminalSquare }, { to: "/developers/cli", name: "CI / CLI", icon: GitBranch }, { to: "/analytics/fine-tunes", name: "Fine-tunes", icon: GitCompareArrows }] as const;
export function Phase4Shell({ title, label, children, action }: { title: string; label: string; children: ReactNode; action?: ReactNode }) {
  return <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 font-mono text-xs uppercase text-primary">GENRI LABS / {label}</p><h1 className="text-3xl font-semibold">{title}</h1></div>{action}</div>
    <nav aria-label="Genri Labs" className="mb-6 flex gap-2 overflow-x-auto border-b pb-3">{tabs.map(({ to, name, icon: Icon }) => <Button key={to} asChild variant="ghost" size="sm"><Link to={to} activeProps={{ className: "bg-secondary text-foreground" }}><Icon />{name}</Link></Button>)}</nav>
    {children}
  </div>;
}
export function MetricStrip({ metrics }: { metrics: { label: string; value: ReactNode; detail?: string; tone?: string }[] }) {
  return <div className="mb-6 grid grid-cols-2 border-y md:grid-cols-4">{metrics.map((m) => <div key={m.label} className="min-w-0 border-r p-4 last:border-r-0"><div className="font-mono text-[10px] uppercase text-muted-foreground">{m.label}</div><div className={`mt-1 break-words font-mono text-2xl tabular ${m.tone ?? "text-foreground"}`}>{m.value}</div>{m.detail && <div className="mt-1 text-xs text-muted-foreground">{m.detail}</div>}</div>)}</div>;
}
export function ExportJson({ name, value }: { name: string; value: unknown }) { return <Button size="sm" variant="outline" onClick={() => download(name, JSON.stringify(value, null, 2))}><Download />Export JSON</Button>; }
export function DemoBadge({ children = "SAMPLE DATA" }: { children?: ReactNode }) { return <span className="inline-flex items-center gap-2 rounded border px-2 py-1 font-mono text-[10px] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{children}</span>; }