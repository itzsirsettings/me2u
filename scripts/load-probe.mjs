#!/usr/bin/env node
import { performance } from "node:perf_hooks";

const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};

const baseUrl = (args.find((arg) => !arg.startsWith("--")) || process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const endpoint = valueAfter("--endpoint", "/api/health/live");
const requests = Math.max(1, Number(valueAfter("--requests", 1000)) || 1000);
const concurrency = Math.max(1, Number(valueAfter("--concurrency", 50)) || 50);
const timeoutMs = Math.max(100, Number(valueAfter("--timeout-ms", 10000)) || 10000);

let nextRequest = 0;
let completed = 0;
let failures = 0;
const latencies = [];

async function worker() {
  while (true) {
    const requestNumber = nextRequest;
    nextRequest += 1;
    if (requestNumber >= requests) return;

    const startedAt = performance.now();
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await Promise.race([
        fetch(`${baseUrl}${endpoint}`, {
          redirect: "manual",
          signal: controller.signal,
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("request timeout")), timeoutMs);
        }),
      ]);
      if (!response.ok) failures += 1;
    } catch {
      failures += 1;
    } finally {
      clearTimeout(timeoutHandle);
      latencies.push(performance.now() - startedAt);
      completed += 1;
      if (completed % 500 === 0 || completed === requests) {
        process.stdout.write(`\rCompleted ${completed}/${requests}`);
      }
    }
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, worker));
latencies.sort((a, b) => a - b);
const percentile = (percent) => latencies[Math.min(latencies.length - 1, Math.ceil((percent / 100) * latencies.length) - 1)] || 0;
const durationSeconds = (performance.now() - startedAt) / 1000;

console.log(`\nLoad probe: ${baseUrl}${endpoint}`);
console.log(`Requests: ${requests}; concurrency: ${concurrency}; timeout: ${timeoutMs}ms`);
console.log(`Throughput: ${(requests / durationSeconds).toFixed(1)} requests/sec`);
console.log(`p50: ${percentile(50).toFixed(1)}ms; p95: ${percentile(95).toFixed(1)}ms; p99: ${percentile(99).toFixed(1)}ms`);
console.log(`Failures: ${failures}`);

if (failures > 0) process.exitCode = 1;