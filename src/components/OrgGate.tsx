import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrgs, type Org, type OrgRole } from "@/lib/org";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ActiveOrg = Org & { myRole: OrgRole };

/** Ensures the user has a workspace; renders a create form otherwise, then passes the active org down. */
export function OrgGate({ children }: { children: (org: ActiveOrg, switcher: React.ReactNode) => React.ReactNode }) {
  const orgs = useOrgs();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (orgs.isLoading) return <p className="py-20 text-center text-sm text-muted-foreground">Loading workspace…</p>;
  if (orgs.error) return <p className="py-20 text-center text-sm text-destructive">Couldn't load your workspace.</p>;

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "org"}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase.from("organizations").insert({ name: name.trim(), slug, created_by: u.user!.id }).select("id").single();
    setBusy(false);
    if (error) return toast.error("Couldn't create the workspace.");
    orgs.choose(data.id); orgs.refresh();
  };

  if (!orgs.active) return (
    <form onSubmit={create} className="mx-auto max-w-md space-y-3 rounded-xl border bg-card p-6">
      <h2 className="text-lg font-semibold">Create your workspace</h2>
      <p className="text-sm text-muted-foreground">Workspaces hold your team, API keys, budget and audit log.</p>
      <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme AI Platform" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
      <button disabled={busy} className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Create workspace</button>
    </form>
  );

  const switcher = (orgs.data?.length ?? 0) > 1 ? (
    <Select value={orgs.active.id} onValueChange={orgs.choose}>
      <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
      <SelectContent>{orgs.data!.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
    </Select>
  ) : null;
  return <>{children(orgs.active, switcher)}</>;
}
