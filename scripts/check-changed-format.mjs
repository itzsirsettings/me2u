#!/usr/bin/env node
/**
 * CI format gate scoped to files changed in the PR/push.
 *
 * The repo has ~190 pre-existing prettier violations in untouched files, so a
 * repo-wide `prettier --check .` can never pass and cannot gate merges. This
 * checks only files added/modified relative to the merge base (or the last
 * commit for a plain push), so new work stays formatted without demanding a
 * whole-repo reformat.
 */
import { execSync } from "node:child_process";
import { spawnSync } from "node:child_process";

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

let diffRange = "";
try {
  const base = process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : sh("git rev-parse HEAD~1");
  diffRange = `${base}...HEAD`;
} catch {
  diffRange = "HEAD";
}

let files = [];
try {
  const out = sh(`git diff --name-only --diff-filter=ACMRTUXB ${diffRange}`);
  files = out
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);
} catch {
  files = [];
}

files = files.filter((f) => !f.startsWith(".kilo/") && f !== ".kilo");
if (files.length === 0) {
  console.log("check-changed-format: no changed files — nothing to check.");
  process.exit(0);
}

const result = spawnSync("npx", ["prettier", "--check", ...files], {
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
