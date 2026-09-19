#!/usr/bin/env node
/**
 * G6 performance probe: measures p50/p95 latency for public endpoints.
 *
 * Usage:
 *   node scripts/perf-probe.mjs [baseUrl] [--runs N]
 *
 * Defaults to PLAYWRIGHT_BASE_URL / http://127.0.0.1:3000. Read-only GETs
 * only — safe to run against production. Results are advisory (no exit
 * failure); compare against the p95 < 500ms guidance in the audit spec.
 */
import { performance } from "node:perf_hooks";

const args = process.argv.slice(2);
const runsFlagIndex = args.indexOf("--runs");
const runs = runsFlagIndex >= 0 ? Math.max(5, Number(args[runsFlagIndex + 1]) || 20) : 20;
const baseUrl = (
  args.find((arg, i) => arg !== "--runs" && i !== runsFlagIndex + 1) ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "http://127.0.0.1:3000"
).replace(/\/$/, "");

const endpoints = ["/", "/login", "/register", "/bills", "/learn"];

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function probe(endpoint, runCount) {
  const samples = [];
  let failures = 0;
  for (let i = 0; i < runCount; i += 1) {
    const start = performance.now();
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, { redirect: "manual" });
      // Treat any < 500 as service-ok for latency purposes (redirects count).
      if (res.status >= 500) failures += 1;
    } catch {
      failures += 1;
    }
    samples.push(performance.now() - start);
    // Small gap so a local dev server is not hammered
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  samples.sort((a, b) => a - b);
  return {
    endpoint,
    p50: Math.round(percentile(samples, 50)),
    p95: Math.round(percentile(samples, 95)),
    max: Math.round(samples[samples.length - 1] ?? 0),
    failures,
  };
}

const results = [];
for (const endpoint of endpoints) {
  results.push(await probe(endpoint, runs));
}

console.log(`\nPerf probe → ${baseUrl} (${runs} runs per endpoint)\n`);
console.table(results);

const failing = results.reduce((sum, r) => sum + r.failures, 0);
const slowP95 = results.filter((r) => r.p95 > 500);
if (failing > 0) console.warn(`⚠️  ${failing} request(s) returned 5xx or failed.`);
if (slowP95.length > 0) {
  console.warn(
    `⚠️  p95 > 500ms on: ${slowP95.map((r) => `${r.endpoint} (${r.p95}ms)`).join(", ")}`,
  );
} else {
  console.log("✅ All probed endpoints returned p95 ≤ 500ms.");
}
