import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Sparkles, Gavel, Terminal, Building2, LogOut, Swords, LineChart, Activity, Calculator, Bot, FlaskConical, KeyRound, GitCompare, Code2 } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { models } from "@/lib/models";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { TickerTape } from "./TickerTape";

const links = [
  { to: "/analytics", label: "Benchmarks", icon: LineChart },
  { to: "/arena", label: "Arena", icon: Swords },
  { to: "/status", label: "Status", icon: Activity },
  { to: "/router-calculator", label: "Router", icon: Calculator },
  { to: "/evals/agentic", label: "Agentic", icon: Bot },
  { to: "/benchmarks/custom", label: "Custom Evals", icon: FlaskConical },
  { to: "/search/semantic", label: "Smart Search", icon: Sparkles },
  { to: "/evals/judge-arena", label: "Judge Arena", icon: Gavel },
  { to: "/developers/portal", label: "API Portal", icon: Terminal },
  { to: "/settings/organization", label: "Workspace", icon: Building2 },
  { to: "/developer", label: "Code Export", icon: KeyRound },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useUser();
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const go = (fn: () => void) => { setOpen(false); fn(); };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-xl">
      <TickerTape />
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-signal font-mono text-sm font-bold text-primary-foreground">G</span>
          Genri<span className="text-primary">AI</span>
        </Link>
        <button onClick={() => setOpen(true)} className="flex flex-1 items-center gap-2 rounded-md border bg-panel px-3 py-1.5 text-sm text-muted-foreground md:max-w-sm">
          <Search className="h-4 w-4" /><span className="truncate">Search or run a command…</span>
          <kbd className="ml-auto hidden rounded border px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
        </button>
        {user ? (
          <button onClick={() => supabase.auth.signOut()} title={user.email ?? ""} className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"><LogOut className="h-4 w-4" /><span className="hidden max-w-40 truncate sm:inline">{user.email}</span></button>
        ) : <Link to="/auth" className="ml-auto shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">Sign in</Link>}
      </div>
      <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "bg-secondary text-foreground" }}>
            <Icon className="h-3.5 w-3.5" />{label}
          </Link>
        ))}
      </nav>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search models or run an action…" />
        <CommandList>
          <CommandEmpty>Nothing found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => go(() => navigate({ to: "/analytics", search: { compare: "claude-3-5-sonnet,gpt-4o" } }))}><GitCompare className="mr-2 h-4 w-4" />Compare Claude 3.5 Sonnet with GPT-4o</CommandItem>
            <CommandItem onSelect={() => go(() => navigate({ to: "/router-calculator", search: { tokens: 10 } }))}><Calculator className="mr-2 h-4 w-4" />Calculate ROI for 10M tokens</CommandItem>
            <CommandItem onSelect={() => go(() => navigate({ to: "/status", search: { host: "Groq" } }))}><Activity className="mr-2 h-4 w-4" />Check Groq live status</CommandItem>
            <CommandItem onSelect={() => go(() => navigate({ to: "/developer" }))}><Code2 className="mr-2 h-4 w-4" />Export API code</CommandItem>
            <CommandItem onSelect={() => go(() => navigate({ to: "/search/semantic" }))}><Sparkles className="mr-2 h-4 w-4" />Find a model by description</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Pages">
            {links.map((l) => <CommandItem key={l.to} onSelect={() => go(() => navigate({ to: l.to }))}><l.icon className="mr-2 h-4 w-4" />{l.label}</CommandItem>)}
          </CommandGroup>
          <CommandGroup heading="Models">
            {models.map((m) => (
              <CommandItem key={m.slug} value={`${m.name} ${m.provider} ${m.category}`} onSelect={() => go(() => navigate({ to: "/models/$slug", params: { slug: m.slug } }))}>
                <span className="font-medium">{m.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{m.provider} · {m.category}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}

export function ProviderAvatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-xl border font-mono font-bold text-background" style={{ background: color, width: size, height: size, fontSize: size * 0.4 }}>
      {name[0]}
    </span>
  );
}

export function PageTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
      {sub && <p className="mt-2 max-w-2xl text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Panel({ title, sub, children, className = "" }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border bg-card p-5 ${className}`}>
      <h2 className="font-semibold">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
