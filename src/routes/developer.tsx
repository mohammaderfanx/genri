import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, KeyRound, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { models, isImage } from "@/lib/models";
import { PageTitle, Panel } from "@/components/SiteHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/developer")({
  head: () => ({
    meta: [
      { title: "Developer Hub — API Keys & Code Export | Genri AI" },
      { name: "description", content: "Create Genri universal proxy keys and export ready-to-run code for openai, anthropic, AI SDK, LangChain and LlamaIndex." },
      { property: "og:title", content: "Genri AI Developer Hub" },
      { property: "og:description", content: "Universal proxy keys with built-in latency and token telemetry." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Developer,
});

type Key = { id: string; name: string; secret: string; created: string; requests: number };
const libs = ["openai", "anthropic", "@ai-sdk/react", "langchain", "llamaindex"] as const;
const llms = models.filter((m) => !isImage(m));

const snippet = (lib: (typeof libs)[number], model: string, key: string) => {
  const k = key || "gk_live_…";
  switch (lib) {
    case "openai": return `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  baseURL: "https://api.genri.ai/v1",\n  apiKey: "${k}",\n});\n\nconst res = await client.chat.completions.create({\n  model: "${model}",\n  messages: [{ role: "user", content: "Hello" }],\n});`;
    case "anthropic": return `import Anthropic from "@anthropic-ai/sdk";\n\nconst client = new Anthropic({\n  baseURL: "https://api.genri.ai/anthropic",\n  apiKey: "${k}",\n});\n\nconst msg = await client.messages.create({\n  model: "${model}",\n  max_tokens: 1024,\n  messages: [{ role: "user", content: "Hello" }],\n});`;
    case "@ai-sdk/react": return `"use client";\nimport { useChat } from "@ai-sdk/react";\n\n// Server route proxies to Genri with GENRI_API_KEY=${k}\nexport function Chat() {\n  const { messages, sendMessage } = useChat({\n    api: "/api/chat", body: { model: "${model}" },\n  });\n  return <button onClick={() => sendMessage({ text: "Hello" })}>Send</button>;\n}`;
    case "langchain": return `from langchain_openai import ChatOpenAI\n\nllm = ChatOpenAI(\n    model="${model}",\n    base_url="https://api.genri.ai/v1",\n    api_key="${k}",\n)\nprint(llm.invoke("Hello").content)`;
    case "llamaindex": return `from llama_index.llms.openai_like import OpenAILike\n\nllm = OpenAILike(\n    model="${model}",\n    api_base="https://api.genri.ai/v1",\n    api_key="${k}",\n    is_chat_model=True,\n)\nprint(llm.complete("Hello"))`;
  }
};

function makeSecret() {
  const b = new Uint8Array(18); crypto.getRandomValues(b);
  return "gk_live_" + [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function Developer() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [name, setName] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const [lib, setLib] = useState<(typeof libs)[number]>("openai");
  const [model, setModel] = useState("claude-3-5-sonnet");
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };

  const create = () => {
    const k: Key = { id: String(Date.now()), name: name.trim() || `Key ${keys.length + 1}`, secret: makeSecret(), created: new Date().toLocaleDateString(), requests: 0 };
    setKeys([k, ...keys]); setShown(k.id); setName("");
    toast.success("Key created — copy it now");
  };
  const code = snippet(lib, model, keys[0]?.secret ?? "");

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-10">
      <PageTitle eyebrow="Developer" title="One key, every model" sub="Route calls through Genri to log latency and token usage automatically." />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Panel title="Universal proxy keys" sub="Demo keys live only in this browser tab.">
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. production" className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
            <button onClick={create} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><KeyRound className="h-4 w-4" />Create</button>
          </div>
          <ul className="mt-4 divide-y">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center gap-2 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{k.name}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">{shown === k.id ? k.secret : `${k.secret.slice(0, 12)}••••••••`} · {k.created}</div>
                </div>
                <button aria-label="Toggle visibility" onClick={() => setShown(shown === k.id ? null : k.id)} className="p-1 text-muted-foreground">{shown === k.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                <button aria-label="Copy key" onClick={() => copy(k.secret)} className="p-1 text-muted-foreground"><Copy className="h-4 w-4" /></button>
                <button aria-label="Revoke key" onClick={() => setKeys(keys.filter((x) => x.id !== k.id))} className="p-1 text-muted-foreground hover:text-loss"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {keys.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No keys yet.</li>}
          </ul>
        </Panel>
        <Panel title="Playground code">
          <div className="mb-3 flex flex-wrap gap-2">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>{llms.map((m) => <SelectItem key={m.slug} value={m.slug}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
            <button onClick={() => copy(code)} className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"><Copy className="h-4 w-4" />Copy</button>
          </div>
          <div className="mb-2 flex gap-1 overflow-x-auto">{libs.map((l) => <button key={l} onClick={() => setLib(l)} className={`shrink-0 rounded-md px-2.5 py-1 font-mono text-xs ${lib === l ? "bg-secondary" : "text-muted-foreground"}`}>{l}</button>)}</div>
          <pre className="overflow-x-auto rounded-lg border bg-background p-4 font-mono text-xs leading-relaxed">{code}</pre>
        </Panel>
      </div>
    </div>
  );
}
