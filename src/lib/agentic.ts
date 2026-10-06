export const suites = ["SWE-bench Lite", "WebArena", "GAIA", "ToolBench", "Tau-bench"] as const;
export type Suite = (typeof suites)[number];

export interface AgenticEval { model: string; slug: string; suite: Suite; pass: number; toolCalls: number; efficiency: number; cost: number }

const raw: [string, string, number[], number, number, number][] = [
  // name, slug, pass@1 per suite, avg tool calls, token efficiency, $/task
  ["Claude 3.5 Sonnet", "claude-3-5-sonnet", [49, 36, 42, 71, 69], 14, 82, 0.42],
  ["GPT-4o", "gpt-4o", [38, 31, 39, 68, 60], 11, 78, 0.31],
  ["o1", "o1", [48, 34, 48, 66, 64], 9, 61, 2.1],
  ["DeepSeek R1", "deepseek-r1", [45, 27, 41, 63, 55], 17, 70, 0.09],
  ["Gemini 1.5 Pro", "gemini-1-5-pro", [33, 29, 36, 61, 52], 12, 74, 0.18],
  ["Llama 3.3 70B", "llama-3-3-70b", [26, 18, 28, 58, 44], 15, 76, 0.03],
  ["Qwen 2.5 Max", "qwen-2-5-max", [31, 22, 33, 60, 48], 13, 72, 0.12],
  ["Mistral Large 2", "mistral-large-2", [29, 20, 30, 64, 47], 12, 75, 0.14],
];

export const agenticEvals: AgenticEval[] = raw.flatMap(([model, slug, p, toolCalls, efficiency, cost]) =>
  suites.map((suite, i) => ({ model, slug, suite, pass: p[i]!, toolCalls: toolCalls + i, efficiency, cost: +(cost * (1 + i * 0.3)).toFixed(3) })),
);

export type StepKind = "bash" | "search" | "edit" | "browse" | "think";
export interface Step { kind: StepKind; label: string; detail: string; ok: boolean; ms: number }

export const replayTask = "SWE-bench Lite · django__django-11099: UsernameValidator allows trailing newline";

export const traces: Record<string, Step[]> = {
  "claude-3-5-sonnet": [
    { kind: "think", label: "Plan", detail: "Locate validators, reproduce, patch regex anchors, run tests.", ok: true, ms: 820 },
    { kind: "bash", label: "grep -rn UsernameValidator", detail: "django/contrib/auth/validators.py:9", ok: true, ms: 140 },
    { kind: "edit", label: "validators.py", detail: "regex = r'^[\\w.@+-]+$' → r'\\A[\\w.@+-]+\\Z'", ok: true, ms: 390 },
    { kind: "bash", label: "pytest tests/auth_tests -k validator", detail: "24 passed in 3.1s", ok: true, ms: 3100 },
    { kind: "think", label: "Submit", detail: "Patch resolves trailing-newline bypass.", ok: true, ms: 210 },
  ],
  "gpt-4o": [
    { kind: "think", label: "Plan", detail: "Search the codebase for the validator.", ok: true, ms: 560 },
    { kind: "search", label: "search 'UsernameValidator'", detail: "3 matches", ok: true, ms: 220 },
    { kind: "edit", label: "validators.py", detail: "Added .strip() before validation", ok: true, ms: 340 },
    { kind: "bash", label: "pytest tests/auth_tests -k validator", detail: "1 failed: test_unicode_validator", ok: false, ms: 3300 },
    { kind: "edit", label: "validators.py", detail: "regex anchors → \\A … \\Z", ok: true, ms: 310 },
    { kind: "bash", label: "pytest tests/auth_tests -k validator", detail: "24 passed in 3.0s", ok: true, ms: 3000 },
  ],
  "deepseek-r1": [
    { kind: "think", label: "Reason", detail: "$ matches before trailing \\n in Python re — need \\Z.", ok: true, ms: 4200 },
    { kind: "bash", label: "find . -name validators.py", detail: "django/contrib/auth/validators.py", ok: true, ms: 180 },
    { kind: "edit", label: "validators.py", detail: "regex anchors → \\A … \\Z", ok: true, ms: 450 },
    { kind: "bash", label: "pytest tests/auth_tests -k validator", detail: "24 passed in 3.2s", ok: true, ms: 3200 },
  ],
  "llama-3-3-70b": [
    { kind: "browse", label: "docs.djangoproject.com", detail: "Read validators reference", ok: true, ms: 1200 },
    { kind: "bash", label: "grep -rn UsernameValidator", detail: "validators.py:9", ok: true, ms: 150 },
    { kind: "edit", label: "validators.py", detail: "Added flags=re.MULTILINE", ok: false, ms: 300 },
    { kind: "bash", label: "pytest tests/auth_tests -k validator", detail: "3 failed", ok: false, ms: 3400 },
    { kind: "think", label: "Give up", detail: "Max retries reached.", ok: false, ms: 200 },
  ],
};
