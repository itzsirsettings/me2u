/**
 * Postgres error helpers shared by the money-path routes.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/** True when the error is a Postgres UNIQUE violation (SQLSTATE 23505). */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  if (!isRecord(error) || error.code !== "23505") return false;
  if (!constraint) return true;
  const hit = error.constraint === constraint;
  const message = typeof error.message === "string" ? error.message : "";
  return hit || message.includes(constraint);
}
