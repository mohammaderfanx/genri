import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, compareReports } from "./genri-core.mjs";
test("local CLI fails outputs that do not match", () => assert.equal(evaluate({ tests: [{ expected: "DE", actual: "US" }] }).status, "failed"));
test("local CLI enforces a $0.50 budget", () => assert.equal(evaluate({ tests: [{ expected: "DE", actual: "DE", cost_usd: 0.51 }] }, { maxCost: 0.5 }).status, "failed"));
test("local CLI reports nearest-rank P95 and gates latency", () => { const r = evaluate({ tests: Array.from({ length: 20 }, (_, i) => ({ expected: "ok", actual: "ok", latency_ms: i + 1 })) }, { maxP95: 18 }); assert.equal(r.latency_p95_ms, 19); assert.equal(r.status, "failed"); });
test("report comparison uses signed deltas", () => assert.deepEqual(compareReports({ cost_usd: 0.5, latency_p95_ms: 150, passed_tests: 10 }, { cost_usd: 0.4, latency_p95_ms: 120, passed_tests: 9 }), { cost_delta_usd: -0.09999999999999998, latency_p95_delta_ms: -30, passed_tests_delta: -1 }));