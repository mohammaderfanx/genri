// Client-safe list of the real AI models used for judging and live benchmark runs.
export const JUDGES = [
  { id: "openai/gpt-6-astra", label: "GPT-6 Astra" },
  { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra" },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 mini" },
] as const;
export const CANDIDATES = [
  { id: "openai/gpt-6-luna", label: "GPT-6 Luna" },
  { id: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna" },
  { id: "openai/gpt-5.4-nano", label: "GPT-5.4 nano" },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 mini" },
] as const;
export const isAllowed = (list: readonly { id: string }[], id: string) => list.some((m) => m.id === id);
export const labelOf = (id: string) => [...JUDGES, ...CANDIDATES].find((m) => m.id === id)?.label ?? id;
