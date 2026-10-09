import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Org = Database["public"]["Tables"]["organizations"]["Row"];
export type OrgRole = Database["public"]["Enums"]["org_role"];

/** Orgs the signed-in user belongs to (accepting any pending invites first), plus the active one. */
export function useOrgs() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["orgs"],
    staleTime: 30_000,
    queryFn: async () => {
      await supabase.rpc("accept_my_invites");
      const { data: u } = await supabase.auth.getUser();
      const { data: mem, error } = await supabase.from("organization_members").select("role, organizations(*)").eq("user_id", u.user!.id);
      if (error) throw error;
      return (mem ?? []).filter((m) => m.organizations).map((m) => ({ ...(m.organizations as Org), myRole: m.role as OrgRole }));
    },
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => { setActiveId(localStorage.getItem("genri.org")); }, []);
  const choose = (id: string) => { localStorage.setItem("genri.org", id); setActiveId(id); };
  const active = q.data?.find((o) => o.id === activeId) ?? q.data?.[0] ?? null;
  return { ...q, active, choose, refresh: () => qc.invalidateQueries({ queryKey: ["orgs"] }) };
}

export async function audit(orgId: string, action: string, detail: Record<string, unknown> = {}) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("audit_logs").insert({ org_id: orgId, actor_id: data.user.id, actor_email: data.user.email ?? null, action, detail: detail as never });
}

export const canManage = (r?: OrgRole) => r === "owner" || r === "admin";
