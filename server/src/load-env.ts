import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

const serverRoot = resolve(__dirname, "..");
const repoRoot = resolve(serverRoot, "..");

// Base config from the repo root .env (Railway PostgreSQL, Paystack, VTpass, ...),
// then server-local overrides, then .env.local which wins over everything.
loadEnv({ path: resolve(repoRoot, ".env") });
loadEnv({ path: resolve(serverRoot, ".env"), override: true });
loadEnv({ path: resolve(repoRoot, ".env.local"), override: true });
