export function evaluate(suite, { maxCost = Infinity, maxP95 = Infinity } = {}) {
  if (!suite || !Array.isArray(suite.tests) || !suite.tests.length) throw new Error("Suite requires a nonempty tests array.");
  if (suite.tests.length > 10000) throw new Error("Maximum 10000 tests per suite.");
  const results = suite.tests.map((t, i) => {
    if (typeof t.expected !== "string" || typeof t.actual !== "string") throw new Error(`Test ${i + 1} requires expected and actual strings. This runner validates captured outputs; it does not invoke models.`);
    const cost = t.cost_usd ?? 0, latency = t.latency_ms ?? 0;
    if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(latency) || latency < 0) throw new Error(`Test ${i + 1} has invalid cost or latency.`);
    return { name: t.name ?? `test-${i + 1}`, passed: t.actual.trim() === t.expected.trim(), cost, latency };
  });
  const sorted = results.map((r) => r.latency).sort((a, b) => a - b);
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
  const cost = results.reduce((s, r) => s + r.cost, 0);
  const failed = results.filter((r) => !r.passed).length;
  return { suite: suite.name ?? "unnamed", mode: "captured-output-validation", passed_tests: results.length - failed, failed_tests: failed, cost_usd: cost, latency_p95_ms: p95, status: failed || cost > maxCost || p95 > maxP95 ? "failed" : "passed", results };
}
export function compareReports(base, candidate) {
  return { cost_delta_usd: candidate.cost_usd - base.cost_usd, latency_p95_delta_ms: candidate.latency_p95_ms - base.latency_p95_ms, passed_tests_delta: candidate.passed_tests - base.passed_tests };
}