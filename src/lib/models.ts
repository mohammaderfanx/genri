export type Category = "Text & Chat" | "Code" | "Image Generation" | "Video" | "Audio" | "Multimodal" | "Reasoning";
export type License = "Proprietary API" | "Open Weights" | "Open Source";

export interface Host { host: string; tps: number; ttft: number; price: number }
export interface AIModel {
  slug: string;
  name: string;
  provider: string;
  category: Category;
  license: License;
  contextWindow: number;
  released: string;
  architecture: string;
  pricing: { input: number; output: number; blended: number };
  metrics: { ttft: number; tps: number; p95: number };
  scores: { elo: number; mmluPro: number; humanEval: number; gpqa: number; math500: number };
  domains: { Coding: number; Logic: number; "Long Context": number; Instruction: number; Creative: number };
  rating: number;
  reviews: number;
  ratingDist: [number, number, number, number, number];
  description: string;
  trending?: boolean;
  hosts: Host[];
  color: string;
}

export const models: AIModel[] = [
  {
    slug: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", category: "Code", license: "Proprietary API",
    contextWindow: 200000, released: "2024-10-22", architecture: "Dense transformer",
    pricing: { input: 3, output: 15, blended: 6 }, metrics: { ttft: 780, tps: 78, p95: 1650 },
    scores: { elo: 1283, mmluPro: 78, humanEval: 93, gpqa: 65, math500: 78 },
    domains: { Coding: 95, Logic: 86, "Long Context": 90, Instruction: 93, Creative: 88 },
    rating: 4.9, reviews: 2841, ratingDist: [2210, 480, 98, 31, 22], trending: true, color: "oklch(0.72 0.14 50)",
    description: "Anthropic's flagship for agentic coding, nuanced writing and long-document reasoning.",
    hosts: [{ host: "Anthropic", tps: 78, ttft: 780, price: 6 }, { host: "AWS Bedrock", tps: 64, ttft: 940, price: 6 }, { host: "Google Vertex", tps: 70, ttft: 860, price: 6 }],
  },
  {
    slug: "gpt-4o", name: "GPT-4o", provider: "OpenAI", category: "Multimodal", license: "Proprietary API",
    contextWindow: 128000, released: "2024-08-06", architecture: "Omni multimodal transformer",
    pricing: { input: 2.5, output: 10, blended: 4.4 }, metrics: { ttft: 420, tps: 112, p95: 980 },
    scores: { elo: 1285, mmluPro: 74, humanEval: 90, gpqa: 53, math500: 75 },
    domains: { Coding: 88, Logic: 82, "Long Context": 80, Instruction: 92, Creative: 90 },
    rating: 4.7, reviews: 5120, ratingDist: [3500, 1100, 320, 120, 80], trending: true, color: "oklch(0.75 0.13 160)",
    description: "Fast omni model handling text, vision and audio with strong all-round quality.",
    hosts: [{ host: "OpenAI", tps: 112, ttft: 420, price: 4.4 }, { host: "Azure", tps: 98, ttft: 510, price: 4.4 }],
  },
  {
    slug: "deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", category: "Reasoning", license: "Open Weights",
    contextWindow: 128000, released: "2025-01-20", architecture: "MoE 671B (37B active)",
    pricing: { input: 0.55, output: 2.19, blended: 0.96 }, metrics: { ttft: 1900, tps: 62, p95: 4200 },
    scores: { elo: 1361, mmluPro: 84, humanEval: 92, gpqa: 72, math500: 97 },
    domains: { Coding: 90, Logic: 97, "Long Context": 78, Instruction: 84, Creative: 80 },
    rating: 4.8, reviews: 3390, ratingDist: [2600, 560, 140, 50, 40], trending: true, color: "oklch(0.65 0.16 255)",
    description: "Open-weights reasoning engine with chain-of-thought rivaling frontier closed models.",
    hosts: [{ host: "DeepSeek", tps: 28, ttft: 3100, price: 0.96 }, { host: "Together.ai", tps: 62, ttft: 1900, price: 3 }, { host: "Fireworks.ai", tps: 74, ttft: 1500, price: 3 }, { host: "Groq", tps: 275, ttft: 600, price: 1.2 }],
  },
  {
    slug: "llama-3-3-70b", name: "Llama 3.3 70B", provider: "Meta", category: "Text & Chat", license: "Open Weights",
    contextWindow: 128000, released: "2024-12-06", architecture: "Dense 70B transformer",
    pricing: { input: 0.23, output: 0.4, blended: 0.3 }, metrics: { ttft: 120, tps: 180, p95: 420 },
    scores: { elo: 1256, mmluPro: 69, humanEval: 88, gpqa: 50, math500: 77 },
    domains: { Coding: 82, Logic: 78, "Long Context": 76, Instruction: 89, Creative: 81 },
    rating: 4.6, reviews: 1980, ratingDist: [1200, 520, 160, 60, 40], color: "oklch(0.68 0.15 240)",
    description: "The workhorse open model — near-frontier quality at a fraction of the price.",
    hosts: [{ host: "Groq", tps: 330, ttft: 120, price: 0.69 }, { host: "Together.ai", tps: 180, ttft: 290, price: 0.88 }, { host: "Fireworks.ai", tps: 160, ttft: 310, price: 0.9 }, { host: "AWS Bedrock", tps: 52, ttft: 520, price: 0.72 }, { host: "Cerebras", tps: 2100, ttft: 180, price: 0.85 }],
  },
  {
    slug: "gemini-1-5-pro", name: "Gemini 1.5 Pro", provider: "Google", category: "Multimodal", license: "Proprietary API",
    contextWindow: 2000000, released: "2024-09-24", architecture: "Sparse MoE multimodal",
    pricing: { input: 1.25, output: 5, blended: 2.2 }, metrics: { ttft: 640, tps: 92, p95: 1400 },
    scores: { elo: 1260, mmluPro: 76, humanEval: 84, gpqa: 59, math500: 86 },
    domains: { Coding: 83, Logic: 84, "Long Context": 98, Instruction: 86, Creative: 84 },
    rating: 4.5, reviews: 1640, ratingDist: [980, 420, 150, 50, 40], color: "oklch(0.72 0.15 230)",
    description: "Industry-leading 2M token context for whole-codebase and hour-long video analysis.",
    hosts: [{ host: "Google AI Studio", tps: 92, ttft: 640, price: 2.2 }, { host: "Google Vertex", tps: 88, ttft: 690, price: 2.2 }],
  },
  {
    slug: "qwen-2-5-max", name: "Qwen 2.5 Max", provider: "Alibaba", category: "Text & Chat", license: "Proprietary API",
    contextWindow: 32000, released: "2025-01-28", architecture: "Large-scale MoE",
    pricing: { input: 1.6, output: 6.4, blended: 2.8 }, metrics: { ttft: 980, tps: 38, p95: 2100 },
    scores: { elo: 1332, mmluPro: 76, humanEval: 87, gpqa: 60, math500: 83 },
    domains: { Coding: 86, Logic: 85, "Long Context": 70, Instruction: 88, Creative: 82 },
    rating: 4.4, reviews: 760, ratingDist: [420, 210, 80, 30, 20], color: "oklch(0.7 0.16 290)",
    description: "Alibaba's largest MoE model, strong on multilingual and math-heavy tasks.",
    hosts: [{ host: "Alibaba Cloud", tps: 38, ttft: 980, price: 2.8 }],
  },
  {
    slug: "o1", name: "o1", provider: "OpenAI", category: "Reasoning", license: "Proprietary API",
    contextWindow: 200000, released: "2024-12-17", architecture: "RL-trained reasoning model",
    pricing: { input: 15, output: 60, blended: 26 }, metrics: { ttft: 9800, tps: 74, p95: 22000 },
    scores: { elo: 1352, mmluPro: 89, humanEval: 92, gpqa: 78, math500: 96 },
    domains: { Coding: 92, Logic: 98, "Long Context": 84, Instruction: 88, Creative: 78 },
    rating: 4.6, reviews: 1320, ratingDist: [880, 280, 90, 40, 30], color: "oklch(0.8 0.02 0)",
    description: "Deliberate, extended thinking for PhD-level science, math and hard code problems.",
    hosts: [{ host: "OpenAI", tps: 74, ttft: 9800, price: 26 }, { host: "Azure", tps: 66, ttft: 11200, price: 26 }],
  },
  {
    slug: "mistral-large-2", name: "Mistral Large 2", provider: "Mistral", category: "Code", license: "Open Weights",
    contextWindow: 128000, released: "2024-11-18", architecture: "Dense 123B transformer",
    pricing: { input: 2, output: 6, blended: 3 }, metrics: { ttft: 480, tps: 44, p95: 1100 },
    scores: { elo: 1251, mmluPro: 70, humanEval: 92, gpqa: 49, math500: 74 },
    domains: { Coding: 89, Logic: 79, "Long Context": 77, Instruction: 87, Creative: 80 },
    rating: 4.3, reviews: 540, ratingDist: [280, 160, 60, 25, 15], color: "oklch(0.75 0.17 55)",
    description: "European frontier model with excellent function calling and 80+ coding languages.",
    hosts: [{ host: "Mistral", tps: 44, ttft: 480, price: 3 }, { host: "AWS Bedrock", tps: 36, ttft: 620, price: 3 }],
  },
  {
    slug: "flux-1-dev", name: "Flux.1 Dev", provider: "Black Forest Labs", category: "Image Generation", license: "Open Weights",
    contextWindow: 512, released: "2024-08-01", architecture: "12B rectified flow transformer",
    pricing: { input: 0, output: 25, blended: 25 }, metrics: { ttft: 2400, tps: 0.4, p95: 4800 },
    scores: { elo: 1105, mmluPro: 0, humanEval: 0, gpqa: 0, math500: 0 },
    domains: { Coding: 0, Logic: 40, "Long Context": 30, Instruction: 92, Creative: 94 },
    rating: 4.8, reviews: 2210, ratingDist: [1750, 330, 80, 30, 20], trending: true, color: "oklch(0.85 0.02 0)",
    description: "State-of-the-art open image model with superb prompt adherence and typography.",
    hosts: [{ host: "Together.ai", tps: 0.5, ttft: 1900, price: 25 }, { host: "Fal.ai", tps: 0.6, ttft: 1600, price: 25 }, { host: "Replicate", tps: 0.4, ttft: 2400, price: 30 }],
  },
  {
    slug: "midjourney-v6", name: "Midjourney v6", provider: "Midjourney", category: "Image Generation", license: "Proprietary API",
    contextWindow: 350, released: "2023-12-21", architecture: "Proprietary diffusion",
    pricing: { input: 0, output: 40, blended: 40 }, metrics: { ttft: 30000, tps: 0.03, p95: 60000 },
    scores: { elo: 1093, mmluPro: 0, humanEval: 0, gpqa: 0, math500: 0 },
    domains: { Coding: 0, Logic: 35, "Long Context": 20, Instruction: 82, Creative: 98 },
    rating: 4.7, reviews: 4100, ratingDist: [3000, 760, 210, 80, 50], color: "oklch(0.7 0.05 260)",
    description: "The aesthetic gold standard for stylized, cinematic and artistic imagery.",
    hosts: [{ host: "Midjourney", tps: 0.03, ttft: 30000, price: 40 }],
  },
];

export const isImage = (m: AIModel) => m.category === "Image Generation" || m.category === "Video";
export const getModel = (slug: string) => models.find((m) => m.slug === slug);
export const fmtCtx = (n: number) => (n >= 1e6 ? `${n / 1e6}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`);
export const fmtPrice = (m: AIModel) => (isImage(m) ? `$${(m.pricing.output / 1000).toFixed(3)} / img` : `$${m.pricing.blended.toFixed(2)} / 1M`);
