import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { audit, canManage, useOrgs, type OrgRole } from "@/lib/org";
import { OrgGate } from "@/components/OrgGate";
import { PageTitle, Panel } from "@/components/SiteHeader";
import { download, toCsv } from "@/lib/exporters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/settings/organization")({
  head: () => ({ meta: [
    { title: "Workspace Settings — Genri AI" },
    { name: "description", content: "Manage your Genri AI team, roles, budget caps and compliance audit log." },
    { property: "og:title", content: "Workspace Settings — Genri AI" },
    { property: "og:description", content: "Team management and governance for Genri AI workspaces." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <div className="mx-auto max-w-7xl space-y-4 px-4 py-10"><OrgGate>{(org, sw) => <OrgSettings org={org} switcher={sw} />}</OrgGate></div>,
});

type Audit = Database["public"]["Tables"]["audit_logs"]["Row"];
const roles: OrgRole[] = ["admin", "evaluator", "viewer"];
const roleHelp: Record<OrgRole, string> = { owner: "Full control", admin: "Manage team, keys and budget", evaluator: "Run evaluations and benchmarks", viewer: "Read-only access" };

function OrgSettings({ org, switcher }: { org: ReturnType<typeof useOrgs>["active"] & {}; switcher: React.ReactNode }) {
  const qc = useQueryClient();
  const orgs = useOrgs();
  const manage = canManage(org.myRole);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("evaluator");
  const [budget, setBudget] = useState(String(org.monthly_budget_usd));
  useEffect(() => setBudget(String(org.monthly_budget_usd)), [org.id, org.monthly_budget_usd]);

  const members = useQuery({ queryKey: ["members", org.id], queryFn: async () => (await supabase.from("organization_members").select("*").eq("org_id", org.id).order("created_at")).data ?? [] });
  const invites = useQuery({ enabled: manage, queryKey: ["invites", org.id], queryFn: async () => (await supabase.from("organization_invites").select("*").eq("org_id", org.id)).data ?? [] });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["members", org.id] }); qc.invalidateQueries({ queryKey: ["invites", org.id] }); };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("organization_invites").insert({ org_id: org.id, email: email.trim().toLowerCase(), role });
    if (error) return toast.error(error.code === "23505" ? "Already invited." : "Couldn't send the invite.");
    await audit(org.id, "member.invited", { email, role });
    toast.success("Invite saved — they'll join when they sign in with that email."); setEmail(""); refresh();
  };
  const changeRole = async (id: string, r: OrgRole, who: string | null) => {
    const { error } = await supabase.from("organization_members").update({ role: r }).eq("id", id);
    if (error) return toast.error("Couldn't change the role.");
    await audit(org.id, "member.role_changed", { member: who, role: r }); refresh();
  };
  const remove = async (id: string, who: string | null) => {
    const { error } = await supabase.from("organization_members").delete().eq("id", id);
    if (error) return toast.error("Couldn't remove this member.");
    await audit(org.id, "member.removed", { member: who }); refresh();
  };
  const saveBudget = async () => {
    const v = Number(budget);
    if (!(v >= 0)) return toast.error("Enter a valid amount.");
    const { error } = await supabase.from("organizations").update({ monthly_budget_usd: v }).eq("id", org.id);
    if (error) return toast.error("Couldn't save the budget.");
    await audit(org.id, "budget.updated", { monthly_budget_usd: v }); toast.success("Budget cap saved"); orgs.refresh();
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle eyebrow="Workspace" title={org.name} sub={`${org.plan_tier.toUpperCase()} plan · you are ${org.myRole}`} />
        {switcher}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Panel title="Team" sub="Roles control what each person can do.">
          <ul className="divide-y">
            {(members.data ?? []).map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary font-mono text-xs">{(m.email ?? "?")[0]!.toUpperCase()}</span>
                <span className="min-w-0 flex-1 truncate">{m.email ?? m.user_id}</span>
                {manage && m.role !== "owner" ? (
                  <>
                    <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as OrgRole, m.email)}><SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger><SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                    <button aria-label="Remove member" onClick={() => remove(m.id, m.email)} className="p-1 text-muted-foreground hover:text-loss"><Trash2 className="h-4 w-4" /></button>
                  </>
                ) : <span className="rounded border px-2 py-0.5 font-mono text-xs">{m.role}</span>}
              </li>
            ))}
            {(invites.data ?? []).map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-3 text-sm text-muted-foreground">
                <span className="grid h-8 w-8 place-items-center rounded-full border border-dashed font-mono text-xs">…</span>
                <span className="flex-1 truncate">{i.email} · invited as {i.role}</span>
                <button aria-label="Cancel invite" onClick={async () => { await supabase.from("organization_invites").delete().eq("id", i.id); refresh(); }} className="p-1 hover:text-loss"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          {manage && (
            <form onSubmit={invite} className="mt-4 flex flex-wrap gap-2">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
              <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
              <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><UserPlus className="h-4 w-4" />Invite</button>
            </form>
          )}
        </Panel>
        <div className="space-y-4">
          <Panel title="Monthly budget cap" sub="Org-wide spending limit for evaluations and API usage.">
            <div className="flex gap-2">
              <div className="relative flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span><input disabled={!manage} type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full rounded-md border bg-background py-2 pl-7 pr-3 font-mono text-sm disabled:opacity-60" /></div>
              {manage && <button onClick={saveBudget} className="rounded-md border px-3 text-sm hover:bg-accent">Save</button>}
            </div>
          </Panel>
          <Panel title="Roles">
            <dl className="space-y-2 text-sm">{(Object.keys(roleHelp) as OrgRole[]).map((r) => <div key={r} className="flex gap-2"><dt className="w-20 font-mono text-xs text-primary">{r}</dt><dd className="text-muted-foreground">{roleHelp[r]}</dd></div>)}</dl>
          </Panel>
        </div>
      </div>
      <AuditLog orgId={org.id} />
    </>
  );
}

function AuditLog({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<Audit[]>([]);
  useEffect(() => {
    supabase.from("audit_logs").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(100).then(({ data }) => setRows(data ?? []));
    const ch = supabase.channel(`audit-${orgId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs", filter: `org_id=eq.${orgId}` }, (p) => setRows((r) => [p.new as Audit, ...r].slice(0, 100))).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId]);
  return (
    <Panel title="Compliance audit log" sub="Live record of team, key, budget and export activity.">
      <button onClick={() => download("genri-audit-log.csv", toCsv(rows.map((r) => ({ time: r.created_at, actor: r.actor_email, action: r.action, detail: r.detail }))), "text/csv")} className="mb-3 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-accent"><Download className="h-3.5 w-3.5" />Export CSV</button>
      <ul className="max-h-96 space-y-1 overflow-auto font-mono text-xs">
        {rows.map((r) => (
          <li key={r.id} className="animate-rise flex flex-wrap gap-3 rounded px-2 py-1.5 hover:bg-muted">
            <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            <span className="text-primary">{r.action}</span>
            <span>{r.actor_email}</span>
            <span className="truncate text-muted-foreground">{JSON.stringify(r.detail)}</span>
          </li>
        ))}
        {!rows.length && <li className="py-6 text-center font-sans text-sm text-muted-foreground">No activity yet.</li>}
      </ul>
    </Panel>
  );
}
