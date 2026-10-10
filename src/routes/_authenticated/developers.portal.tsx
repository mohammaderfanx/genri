import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, KeyRound, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { createApiKey } from "@/lib/keys.functions";
import { audit, canManage } from "@/lib/org";
import { OrgGate } from "@/components/OrgGate";
import { PageTitle, Panel } from "@/components/SiteHeader";
import { exportChartPng, download, toCsv } from "@/lib/exporters";

export const Route = createFileRoute("/_authenticated/developers/portal")({
  head: () => ({ meta: [
    { title: "Developer Portal — API Keys, Usage & OpenAPI | Genri AI" },
    { name: "description", content: "Create Genri API keys, track request volume and error rates, and explore the REST API." },
    { property: "og:title", content: "Genri AI Developer Portal" },
    { property: "og:description", content: "API keys, usage analytics and an interactive OpenAPI reference." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <div className="mx-auto max-w-7xl space-y-4 px-4 py-10"><OrgGate>{(org, sw) => <Portal orgId={org.id} manage={canManage(org.myRole)} switcher={sw} />}</OrgGate></div>,
});

function Portal({ orgId, manage, switcher }: { orgId: string; manage: boolean; switcher: React.ReactNode }) {
  const qc = useQueryClient();
  const create = useServerFn(createApiKey);
  const [name, setName] = useState("CI/CD Pipeline Key");
  const [rpm, setRpm] = useState(60);
  const [fresh, setFresh] = useState<string | null>(null);
  const chart = useRef<HTMLDivElement>(null);
  const keys = useQuery({ queryKey: ["keys", orgId], queryFn: async () => (await supabase.from("api_keys").select("id, name, key_prefix, rate_limit_rpm, last_used_at, created_at").eq("org_id", orgId).order("created_at", { ascending: false })).data ?? [] });
  const logs = useQuery({ queryKey: ["logs", orgId], refetchInterval: 15_000, queryFn: async () => (await supabase.from("api_request_logs").select("endpoint, model, status, latency_ms, created_at").eq("org_id", orgId).gte("created_at", new Date(Date.now() - 86400_000).toISOString()).order("created_at").limit(1000)).data ?? [] });

  const onCreate = async () => {
    const r = await create({ data: { orgId, name, rpm } });
    if (!r.ok) return toast.error(r.error);
    setFresh(r.secret); qc.invalidateQueries({ queryKey: ["keys", orgId] });
  };
  const revoke = async (id: string, keyName: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) return toast.error("Couldn't revoke the key.");
    await audit(orgId, "api_key.revoked", { name: keyName }); qc.invalidateQueries({ queryKey: ["keys", orgId] });
  };

  const stats = useMemo(() => {
    const rows = logs.data ?? [];
    const byHour = new Map<string, { hour: string; ok: number; r429: number; r5xx: number; other: number }>();
    for (const r of rows) {
      const h = new Date(r.created_at); h.setMinutes(0, 0, 0);
      const k = h.toISOString(); const b = byHour.get(k) ?? { hour: `${String(h.getHours()).padStart(2, "0")}:00`, ok: 0, r429: 0, r5xx: 0, other: 0 };
      if (r.status < 400) b.ok++; else if (r.status === 429) b.r429++; else if (r.status >= 500) b.r5xx++; else b.other++;
      byHour.set(k, b);
    }
    const byModel = new Map<string, number>(); rows.forEach((r) => r.model && byModel.set(r.model, (byModel.get(r.model) ?? 0) + 1));
    const errs = rows.filter((r) => r.status >= 400).length;
    const lat = rows.map((r) => r.latency_ms ?? 0).sort((a, b) => a - b);
    return { series: [...byHour.values()], byModel: [...byModel.entries()].sort((a, b) => b[1] - a[1]), total: rows.length, errorRate: rows.length ? (errs / rows.length) * 100 : 0, p50: lat[Math.floor(lat.length / 2)] ?? 0 };
  }, [logs.data]);

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3"><PageTitle eyebrow="Developer portal" title="Genri API" sub="Keys, live usage and the REST reference." />{switcher}</div>
      <div className="grid gap-3 sm:grid-cols-4">
        {[["Requests (24h)", stats.total.toLocaleString()], ["Error rate", `${stats.errorRate.toFixed(1)}%`], ["p50 latency", `${stats.p50}ms`], ["Active keys", String(keys.data?.length ?? 0)]].map(([k, v]) => (
          <div key={k} className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground">{k}</div><div className="mt-1 font-mono text-2xl font-semibold tabular">{v}</div></div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Panel title="API keys" sub="Keys are shown once, then stored only as a fingerprint.">
          {manage ? (
            <div className="flex flex-wrap gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
              <input type="number" min={1} value={rpm} onChange={(e) => setRpm(+e.target.value)} aria-label="Requests per minute" className="w-24 rounded-md border bg-background px-2 py-2 font-mono text-sm" />
              <button onClick={onCreate} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><KeyRound className="h-4 w-4" />Create</button>
            </div>
          ) : <p className="text-sm text-muted-foreground">Only owners and admins can create keys.</p>}
          {fresh && (
            <div className="mt-3 rounded-lg border border-primary/50 bg-primary/10 p-3 text-sm">
              <div className="mb-1 font-medium">Copy this key now — it won't be shown again.</div>
              <div className="flex items-center gap-2"><code className="flex-1 truncate font-mono text-xs">{fresh}</code><button onClick={() => copy(fresh)} aria-label="Copy key"><Copy className="h-4 w-4" /></button></div>
            </div>
          )}
          <ul className="mt-3 divide-y">
            {(keys.data ?? []).map((k) => (
              <li key={k.id} className="flex items-center gap-2 py-3 text-sm">
                <div className="min-w-0 flex-1"><div className="font-medium">{k.name}</div><div className="font-mono text-xs text-muted-foreground">{k.key_prefix}•••• · {k.rate_limit_rpm} rpm · {k.last_used_at ? `used ${new Date(k.last_used_at).toLocaleString()}` : "never used"}</div></div>
                {manage && <button aria-label="Revoke key" onClick={() => revoke(k.id, k.name)} className="p-1 text-muted-foreground hover:text-loss"><Trash2 className="h-4 w-4" /></button>}
              </li>
            ))}
            {!keys.data?.length && <li className="py-6 text-center text-sm text-muted-foreground">No keys yet.</li>}
          </ul>
        </Panel>
        <Panel title="Request volume (24h)" sub="Successful calls vs rate-limited (429) and server errors (5xx).">
          <div className="mb-2 flex gap-2">
            <button onClick={() => exportChartPng(chart.current, "genri-usage.png")} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-accent"><Download className="h-3.5 w-3.5" />PNG</button>
            <button onClick={() => { download("genri-usage.csv", toCsv((logs.data ?? []) as Record<string, unknown>[]), "text/csv"); audit(orgId, "usage.exported"); }} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-accent"><Download className="h-3.5 w-3.5" />CSV</button>
          </div>
          <div ref={chart} className="h-60">
            {stats.series.length ? (
              <ResponsiveContainer>
                <BarChart data={stats.series}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={10} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="ok" name="2xx" stackId="a" fill="var(--gain)" />
                  <Bar dataKey="r429" name="429" stackId="a" fill="var(--primary)" />
                  <Bar dataKey="r5xx" name="5xx" stackId="a" fill="var(--loss)" />
                  <Bar dataKey="other" name="4xx" stackId="a" fill="var(--muted-foreground)" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="grid h-full place-items-center text-sm text-muted-foreground">No requests yet — try a call from the reference below.</p>}
          </div>
          {stats.byModel.length > 0 && <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">{stats.byModel.map(([m, n]) => <span key={m} className="rounded border px-2 py-0.5">{m}: {n}</span>)}</div>}
        </Panel>
      </div>
      <OpenApi origin={origin} sample={fresh} />
    </>
  );
}

const endpoints = [
  { method: "GET", path: "/v1/models", summary: "Query the live benchmark and price database.", params: [["category", "e.g. code, reasoning"], ["license", "proprietary | open"], ["max_price", "USD per 1M tokens"], ["max_ttft_ms", "Fastest-host TTFT ceiling"], ["min_elo", "Arena Elo floor"], ["limit", "1–50"]],
    curl: (o: string, k: string) => `curl "${o}/api/public/v1/models?license=open&max_price=1" \\\n  -H "Authorization: Bearer ${k}"` },
  { method: "POST", path: "/v1/route", summary: "Send a prompt to the Genri Smart Router; it picks the best model for your SLA and returns its answer with telemetry.", params: [["prompt", "string, required"], ["sla.priority", "quality | cost | speed"], ["sla.max_ttft_ms", "number"], ["sla.max_price", "number"], ["sla.open_weights_only", "boolean"]],
    curl: (o: string, k: string) => `curl -X POST "${o}/api/public/v1/route" \\\n  -H "Authorization: Bearer ${k}" -H "Content-Type: application/json" \\\n  -d '{"prompt":"Summarise RAFT in 2 lines","sla":{"priority":"cost","max_ttft_ms":500}}'` },
  { method: "GET", path: "/v1/telemetry/live", summary: "Server-Sent Events stream of provider TTFT/TPS by region (every 2s for 60s). Browsers can pass ?key=.", params: [["key", "API key (query, for EventSource)"]],
    curl: (o: string, k: string) => `curl -N "${o}/api/public/v1/telemetry/live" \\\n  -H "Authorization: Bearer ${k}"` },
];

function OpenApi({ origin, sample }: { origin: string; sample: string | null }) {
  const [open, setOpen] = useState(0);
  const key = sample ?? "gk_live_…";
  const spec = { openapi: "3.1.0", info: { title: "Genri AI API", version: "1.0.0" }, servers: [{ url: `${origin}/api/public` }], components: { securitySchemes: { bearer: { type: "http", scheme: "bearer" } } }, security: [{ bearer: [] }],
    paths: Object.fromEntries(endpoints.map((e) => [e.path, { [e.method.toLowerCase()]: { summary: e.summary, parameters: e.method === "GET" ? e.params.map(([n, d]) => ({ name: n, in: "query", description: d, schema: { type: "string" } })) : undefined, responses: { 200: { description: "OK" }, 401: { description: "Invalid key" }, 429: { description: "Rate limited" } } } }])) };
  return (
    <Panel title="OpenAPI reference" sub="Authenticate with a Bearer API key. Limits are enforced per key per minute.">
      <button onClick={() => download("genri-openapi.json", JSON.stringify(spec, null, 2))} className="mb-3 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-accent"><Download className="h-3.5 w-3.5" />openapi.json</button>
      <div className="space-y-2">
        {endpoints.map((e, i) => (
          <div key={e.path} className="rounded-lg border">
            <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${e.method === "GET" ? "bg-speed/15 text-speed" : "bg-gain/15 text-gain"}`}>{e.method}</span>
              <code className="font-mono text-sm">{e.path}</code>
              <span className="ml-2 hidden truncate text-sm text-muted-foreground md:block">{e.summary}</span>
            </button>
            {open === i && (
              <div className="grid gap-4 border-t p-4 md:grid-cols-2">
                <table className="text-sm"><tbody>{e.params.map(([n, d]) => <tr key={n}><td className="py-1 pr-3 font-mono text-xs text-primary">{n}</td><td className="text-muted-foreground">{d}</td></tr>)}</tbody></table>
                <div className="relative"><pre className="overflow-x-auto rounded-md border bg-background p-3 font-mono text-xs">{e.curl(origin, key)}</pre>
                  <button aria-label="Copy" onClick={() => { navigator.clipboard.writeText(e.curl(origin, key)); toast.success("Copied"); }} className="absolute right-2 top-2 text-muted-foreground"><Copy className="h-4 w-4" /></button></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
