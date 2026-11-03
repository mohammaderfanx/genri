#!/usr/bin/env node
// Local capture only; no remote telemetry submission or credentials required.
import { writeFile } from 'node:fs/promises';
const args = process.argv.slice(2);
const get = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const target = get('--url', '');
const count = Number(get('--count', '5'));
const output = get('--output', 'genri-probe-capture.json');
if (!target || !Number.isInteger(count) || count < 1 || count > 100) throw new Error('Use --url HTTPS_URL --count 1..100 [--output path]');
const url = new URL(target);
if (url.protocol !== 'https:' || url.username || url.password) throw new Error('A credential-free HTTPS URL is required.');
const samples = [];
for (let i = 0; i < count; i++) {
  const start = performance.now();
  try { const r = await fetch(url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(10000) }); samples.push({ elapsed_ms: +(performance.now() - start).toFixed(2), status: r.status, timestamp: new Date().toISOString() }); }
  catch { samples.push({ elapsed_ms: +(performance.now() - start).toFixed(2), error: 'Request failed', timestamp: new Date().toISOString() }); }
  if (i + 1 < count) await new Promise(resolve => setTimeout(resolve, 1000));
}
await writeFile(output, JSON.stringify({ source: 'local-http-head-capture', verified: false, target: url.origin + url.pathname, samples }, null, 2));
console.log(`Saved ${samples.length} local samples. No telemetry uploaded.`);
