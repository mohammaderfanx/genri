#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { evaluate, compareReports } from "./genri-core.mjs";

const args = process.argv.slice(2);
const get = (key) => { const i = args.indexOf(key); return i < 0 ? undefined : args[i + 1]; };
const read = async (path) => { if (!path) throw new Error("Required file path missing."); const text = await readFile(path, "utf8"); if (text.length > 10000000) throw new Error("Input file exceeds 10 MB."); return JSON.parse(text); };
const budget = (key) => { const value = get(key); if (value === undefined) return Infinity; const n = Number(value); if (!Number.isFinite(n) || n < 0) throw new Error(`${key} must be a nonnegative number.`); return n; };
try {
  if (args.includes("--model")) throw new Error("--model inference is not available in this local runner. Supply captured actual outputs in the suite.");
  if (args[0] === "eval") {
    const report = evaluate(await read(get("--suite")), { maxCost: budget("--max-cost"), maxP95: budget("--max-p95") });
    await writeFile(get("--output") ?? "genri-report.json", JSON.stringify(report, null, 2));
    console.log(`${report.status.toUpperCase()}: ${report.passed_tests} passed, ${report.failed_tests} failed; $${report.cost_usd.toFixed(4)}; P95 ${report.latency_p95_ms}ms`);
    process.exitCode = report.status === "passed" ? 0 : 1;
  } else if (args[0] === "benchmark") {
    if (get("--diff")) throw new Error("Git range evaluation is not implemented. Use --base report.json --candidate report.json.");
    console.log(JSON.stringify(compareReports(await read(get("--base")), await read(get("--candidate"))), null, 2));
  } else console.log("Genri local CLI (unpublished)\nnode genri.mjs eval --suite evals.json --max-cost 0.50 --max-p95 150\nnode genri.mjs benchmark --base base.json --candidate candidate.json\nDownload genri-core.mjs alongside this file.");
} catch (e) { console.error(e instanceof Error ? e.message : "Evaluation failed"); process.exitCode = 2; }