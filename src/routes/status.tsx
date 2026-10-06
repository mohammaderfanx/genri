import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { hosts, regions, cell, history, uptime, seedIncidents, statusColor, type Status } from "@/lib/telemetry";
import { PageTitle, Panel } from "@/components/SiteHeader";

export const Route = createFileRoute("/status")({
  validateSearch: z.object({ host: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Live AI Provider Status & Latency — Genri AI" },
      { name: "description", content: "Real-time TTFT, throughput and incidents for Groq, Together, OpenAI, Anthropic, DeepSeek and more, by region." },
      { property: "og:title", content: "Live AI Provider Status — Genri AI" },
      { property: "og:description", content: "Regional latency heatmap, incident stream and 30-day SLA leaderboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StatusPage,
});

const heat = (ttft: number) => {
  const t = Math.min(1, Math.log(ttft / 120) / Math.log(30));
  return `oklch(0.75 0.15 ${150 - t * 125} / ${0.25 + t * 0.35})`;
};
const msgs = ["TTFT spike detected", "429 rate climbing", "Throughput recovered", "p95 latency normalised", "Probe timeout"];
const statuses: Status[] = ["Degraded", "RateLimited", "Operational", "Operational", "Outage"];

function StatusPage() {
  const { host: initialHost } = Route.useSearch();
  const [metric, setMetric] = useState<"ttft" | "tps">("ttft");
  const [host, setHost] = useState<string>(hosts.includes(initialHost as never) ? initialHost! : "Groq");
  const [grid, setGrid] = useState(() => hosts.map((h) => regions.map((r) => cell(h, r))));
  const [incidents, setIncidents] = useState(seedIncidents);
  const hist = useMemo(() => history(host).map((p) => ({ ...p, label: `${String(Math.floor(p.t / 60)).padStart(2, "0")}:${String(p.t % 60).padStart(2, "0")}` })), [host]);

  useEffect(() => {
    const id = setInterval(() => {
      setGrid((g) => g.map((row) => row.map((c) => ({ ...c, ttft: Math.max(60, Math.round(c.ttft * (0.94 + Math.random() * 0.12))), tps: Math.max(1, Math.round(c.tps * (0.95 + Math.random() * 0.1))) }))));
      if (Math.random() > 0.6) {
        const i = Math.floor(Math.random() * msgs.length);
        setIncidents((list) => [{ id: Date.now(), host: hosts[Math.floor(Math.random() * hosts.length)]!, region: regions[Math.floor(Math.random() * regions.length)]!, status: statuses[i]!, msg: msgs[i]!, ago: "now" }, ...list].slice(0, 8));
      }
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const sla = hosts.map((h) => ({ host: h, ...uptime(h) })).sort((a, b) => b.score - a.score);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle eyebrow="Live status" title="Global inference matrix" sub="Synthetic probes from 5 regions, refreshed every few seconds." />
        <span className="flex items-center gap-2 font-mono text-xs text-gain"><span className="live-dot h-2 w-2 rounded-full bg-gain" />Streaming</span>
      </div>

      <Panel title="Regional heatmap" sub="Lower TTFT is greener. Click a provider for its 24h history.">
        <div className="mb-3 flex rounded-md border p-0.5 text-sm w-fit">
          {(["ttft", "tps"] as const).map((m) => <button key={m} onClick={() => setMetric(m)} className={`rounded px-3 py-1 ${metric === m ? "bg-secondary" : "text-muted-foreground"}`}>{m.toUpperCase()}</button>)}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] font-mono text-xs tabular">
            <thead><tr className="text-muted-foreground"><th className="py-2 text-left font-sans">Provider</th>{regions.map((r) => <th key={r} className="font-normal">{r}</th>)}</tr></thead>
            <tbody>
              {hosts.map((h, i) => (
                <tr key={h} onClick={() => setHost(h)} className={`cursor-pointer ${host === h ? "outline outline-1 outline-primary" : ""}`}>
                  <td className="py-1 pr-2 font-sans text-sm">{h}</td>
                  {grid[i]!.map((c, j) => (
                    <td key={j} className="p-0.5">
                      <div className="rounded px-2 py-2 text-center transition-colors duration-700" style={{ background: heat(c.ttft) }}>
                        {metric === "ttft" ? `${c.ttft}ms` : `${c.tps}`}
                        {c.status !== "Operational" && <span className={`ml-1 ${statusColor[c.status]}`}>●</span>}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title={`${host} — last 24h`} sub="TTFT in ms, 1-minute probes shown at 15-minute resolution.">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={hist}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--speed)" stopOpacity={0.4} /><stop offset="1" stopColor="var(--speed)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} interval={15} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Area dataKey="ttft" stroke="var(--speed)" fill="url(#g)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Incident stream">
          <ul className="space-y-3">
            {incidents.map((e) => (
              <li key={e.id} className="animate-rise border-l-2 pl-3 text-sm" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2 font-mono text-xs"><span className={statusColor[e.status]}>{e.status}</span><span className="text-muted-foreground">{e.host} · {e.region} · {e.ago}</span></div>
                <p className="mt-0.5 text-muted-foreground">{e.msg}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="30-day SLA leaderboard">
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm tabular">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr className="border-b"><th className="py-2 font-sans">#</th><th className="font-sans">Host</th><th>Uptime</th><th>Median TTFT</th><th>Reliability</th></tr></thead>
            <tbody>{sla.map((s, i) => (
              <tr key={s.host} className="border-b last:border-0"><td className="py-2.5 text-muted-foreground">{i + 1}</td><td className="font-sans">{s.host}</td><td className={s.uptime > 99.9 ? "text-gain" : ""}>{s.uptime}%</td><td>{s.p50}ms</td><td><span className="text-primary">{s.score}</span>/100</td></tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
