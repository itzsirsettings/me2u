import type { ActionResult } from "./types";

import { authorizedFetch } from "@/lib/fetch";


async function readJsonObject(response: Response): Promise<Record<string, unknown>> {
  const value: unknown = await response.json().catch(() => ({}));
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export async function postAuthenticatedJson(
  path: string,
  body: Record<string, unknown>,
): Promise<ActionResult> {
  const response = await authorizedFetch(path, { method: "POST", body: JSON.stringify(body) });
  const data = await readJsonObject(response);
  if (!response.ok)
    return {
      ok: false,
      error: typeof data.error === "string" ? data.error : "Something went wrong.",
    };
  return { ok: true };
}
