import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

const serverRoot = resolve(__dirname, "..");
const repoRoot = resolve(serverRoot, "..");

loadEnv({ path: resolve(serverRoot, ".env") });
loadEnv({ path: resolve(repoRoot, ".env.local"), override: true });
