// Synthetic telemetry. Deterministic (seeded) so server and browser render identically.
export const hosts = ["Groq", "Together.ai", "Fireworks.ai", "DeepSeek", "Anthropic", "OpenAI", "AWS Bedrock", "Azure"] as const;
export const regions = ["us-east", "us-west", "eu-central", "ap-southeast", "sa-east"] as const;
export type Status = "Operational" | "Degraded" | "Outage" | "RateLimited";

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}
const hash = (str: string) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const base: Record<string, { ttft: number; tps: number }> = {
  Groq: { ttft: 140, tps: 320 }, "Together.ai": { ttft: 290, tps: 180 }, "Fireworks.ai": { ttft: 310, tps: 160 },
  DeepSeek: { ttft: 1400, tps: 32 }, Anthropic: { ttft: 780, tps: 78 }, OpenAI: { ttft: 420, tps: 112 },
  "AWS Bedrock": { ttft: 560, tps: 58 }, Azure: { ttft: 510, tps: 98 },
};
const regionMul: Record<string, number> = { "us-east": 1, "us-west": 1.08, "eu-central": 1.25, "ap-southeast": 1.6, "sa-east": 1.85 };

export function cell(host: string, region: string) {
  const r = rng(hash(host + region))();
  const b = base[host]!;
  const ttft = Math.round(b.ttft * regionMul[region]! * (0.9 + r * 0.25));
  const tps = Math.round(b.tps / Math.sqrt(regionMul[region]!) * (0.9 + r * 0.2));
  const status: Status = r > 0.93 ? "Degraded" : r > 0.9 ? "RateLimited" : "Operational";
  return { ttft, tps, status };
}

/** 24h history at 1-minute intervals (1440 points), optionally downsampled. */
export function history(host: string, step = 15) {
  const b = base[host]!;
  const rand = rng(hash(host));
  const out: { t: number; ttft: number; tps: number }[] = [];
  let drift = 1;
  for (let i = 0; i < 1440; i++) {
    drift = Math.min(1.6, Math.max(0.8, drift + (rand() - 0.5) * 0.04));
    const spike = rand() > 0.995 ? 2.2 : 1;
    if (i % step === 0) out.push({ t: i, ttft: Math.round(b.ttft * drift * spike), tps: Math.round(b.tps / drift) });
  }
  return out;
}

export function uptime(host: string) {
  const r = rng(hash(host + "sla"))();
  return { uptime: +(99.5 + r * 0.49).toFixed(2), p50: Math.round(base[host]!.ttft * 0.95), score: Math.round(88 + r * 11) };
}

export const seedIncidents = [
  { id: 1, host: "DeepSeek", region: "ap-southeast", status: "Degraded" as Status, msg: "TTFT p95 rose to 4.1s on R1 (3.2× baseline)", ago: "4m" },
  { id: 2, host: "Anthropic", region: "us-east", status: "RateLimited" as Status, msg: "429 rate on Sonnet climbed to 2.8% of probes", ago: "17m" },
  { id: 3, host: "Groq", region: "eu-central", status: "Operational" as Status, msg: "Llama 3.3 70B recovered — 330 TPS restored", ago: "41m" },
  { id: 4, host: "Azure", region: "sa-east", status: "Outage" as Status, msg: "GPT-4o endpoint returned 503 for 6 minutes", ago: "2h" },
];

export const statusColor: Record<Status, string> = { Operational: "text-gain", Degraded: "text-primary", RateLimited: "text-speed", Outage: "text-loss" };
