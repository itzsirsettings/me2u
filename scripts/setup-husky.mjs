#!/usr/bin/env node
/**
 * Install Git hooks (husky) when the project is checked out with a .git dir.
 *
 * Why not `"prepare": "husky"`: production installs (Railway/NIXPACKS, Docker)
 * run `npm ci` inside a build context that has no `.git`, where the husky CLI
 * can exit non-zero and fail the whole install. This wrapper always exits 0 and
 * simply skips hook installation when git metadata is unavailable.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const isGitRepo = existsSync(".git");

if (!isGitRepo) {
  console.log("setup-husky: no .git directory — skipping Git hook installation.");
  process.exit(0);
}

const hooksDir = ".husky";
if (!existsSync(hooksDir)) {
  console.log("setup-husky: no .husky directory — nothing to install.");
  process.exit(0);
}

const result = spawnSync("husky", { stdio: "inherit", shell: true });

if (result.error || result.status !== 0) {
  console.warn(
    "setup-husky: husky CLI unavailable or failed; continuing without Git hooks.",
    result.error ? String(result.error) : `exit=${result.status}`,
  );
}

process.exit(0);
