/**
 * Structured server logger (pino) with safe console fallback.
 *
 * Mirrors lib/server/logger.ts so the standalone NestJS API keeps a clean
 * `dist/main.js` layout and has no cross-package source dependency or
 * path-alias that Node cannot resolve at runtime.
 *
 * Usage: logApiError(route, error) / logInfo(...) / logWarn(...)
 */
import pino from "pino";

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

const baseLogger = pino({
  level,
  base: { service: "me2u-api" },
  redact: {
    paths: [
      "password",
      "pin",
      "otp",
      "code",
      "token",
      "accessToken",
      "*.password",
      "*.pin",
      "*.otp",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
});

export function logInfo(message: string, data?: Record<string, unknown>): void {
  try {
    baseLogger.info(data ?? {}, message);
  } catch {
    console.log(`[INFO] ${message}`, data ?? "");
  }
}

export function logWarn(message: string, data?: Record<string, unknown>): void {
  try {
    baseLogger.warn(data ?? {}, message);
  } catch {
    console.warn(`[WARN] ${message}`, data ?? "");
  }
}

export function logApiError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  try {
    baseLogger.error({ context, err: error, stack }, `[${context}] ${message}`);
  } catch {
    console.error(`[${context}] Error:`, message);
    if (stack) console.error(stack);
  }
}

export default baseLogger;
