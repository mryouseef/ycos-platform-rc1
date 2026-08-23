import { mkdirSync, writeFileSync } from "node:fs";

const baseUrl = process.env.M10_BASE_URL ?? "http://127.0.0.1:3000";
const iterations = 7;
const routes = [
  { path: "/ar", headers: {} },
  { path: "/en", headers: {} },
  { path: "/ar/portal/requests", headers: { "x-ycos-e2e-scenario": "CLIENT_A" } },
  { path: "/en/portal/knowledge", headers: { "x-ycos-e2e-scenario": "PROJECT_A" } },
];

const percentile = (values, p) => values[Math.min(values.length - 1, Math.floor(values.length * p))];
const results = [];
for (const route of routes) {
  const samples = [];
  for (let i = 0; i < iterations; i += 1) {
    const started = performance.now();
    const response = await fetch(`${baseUrl}${route.path}`, { headers: route.headers, cache: "no-store" });
    await response.arrayBuffer();
    samples.push({ durationMs: Number((performance.now() - started).toFixed(2)), status: response.status });
  }
  const durations = samples.map((sample) => sample.durationMs).sort((a, b) => a - b);
  results.push({ path: route.path, iterations, statuses: [...new Set(samples.map((sample) => sample.status))], medianMs: percentile(durations, 0.5), p95Ms: percentile(durations, 0.95), maxMs: durations.at(-1), samples });
}
mkdirSync("artifacts/m10", { recursive: true });
writeFileSync("artifacts/m10/m10-performance-baseline.json", `${JSON.stringify({ environment: "local synthetic Next.js development server", baseUrl, warmup: "first response retained; no production claim", dataset: "bounded synthetic Alpha/Beta fixtures", generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
