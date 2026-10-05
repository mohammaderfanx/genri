import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Swords, LineChart } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { models } from "@/lib/models";
import { toast } from "sonner";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const nav = "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-signal font-mono text-sm font-bold text-primary-foreground">G</span>
          Genri<span className="text-primary">AI</span>
        </Link>
        <button onClick={() => setOpen(true)} className="ml-2 hidden flex-1 items-center gap-2 rounded-md border bg-panel px-3 py-1.5 text-sm text-muted-foreground md:flex md:max-w-sm">
          <Search className="h-4 w-4" /> Search models, providers…
          <kbd className="ml-auto rounded border px-1.5 font-mono text-[10px]">⌘K</kbd>
        </button>
        <nav className="ml-auto flex items-center gap-1">
          <Link to="/analytics" className={nav} activeProps={{ className: "text-foreground" }}>
            <span className="inline-flex items-center gap-1.5"><LineChart className="h-4 w-4" />Benchmark Matrix</span>
          </Link>
          <Link to="/arena" className={nav} activeProps={{ className: "text-foreground" }}>
            <span className="inline-flex items-center gap-1.5"><Swords className="h-4 w-4" />Arena</span>
          </Link>
          <button onClick={() => toast("Accounts are coming soon")} className="ml-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">Sign in</button>
        </nav>
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search models, providers, capabilities…" />
        <CommandList>
          <CommandEmpty>No models found.</CommandEmpty>
          <CommandGroup heading="Models">
            {models.map((m) => (
              <CommandItem key={m.slug} value={`${m.name} ${m.provider} ${m.category}`} onSelect={() => { setOpen(false); navigate({ to: "/models/$slug", params: { slug: m.slug } }); }}>
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
