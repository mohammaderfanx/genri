import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ next: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — Genri AI" },
      { name: "description", content: "Sign in to Genri AI to run judge evaluations, manage API keys and your team workspace." },
      { property: "og:title", content: "Sign in — Genri AI" },
      { property: "og:description", content: "Access your Genri AI workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/settings/organization");

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const target = safeNext(next);

  useEffect(() => {
    if (next) sessionStorage.setItem("genri.next", target);
    const go = () => { const t = sessionStorage.getItem("genri.next") ?? target; sessionStorage.removeItem("genri.next"); navigate({ to: t }); };
    supabase.auth.getSession().then(({ data }) => { if (data.session) go(); });
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) go(); });
    return () => sub.subscription.unsubscribe();
  }, [next, target, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error, data } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(target)}` } });
    setBusy(false);
    if (error) return void toast.error(error.message);
    if (mode === "up" && !data.session) toast.success("Check your inbox to confirm your email.");
  };

  const google = async () => {
    sessionStorage.setItem("genri.next", target);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth` });
    if (r.error) toast.error("Google sign-in failed. Please try again.");
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Genri workspace</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
      <button onClick={google} className="mt-8 w-full rounded-md border bg-panel py-2.5 text-sm font-medium hover:bg-accent">Continue with Google</button>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <form onSubmit={submit} className="space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ characters)" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        <button disabled={busy} className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? "…" : mode === "in" ? "Sign in" : "Sign up"}</button>
      </form>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 text-sm text-muted-foreground hover:text-foreground">
        {mode === "in" ? "No account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
