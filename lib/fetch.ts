/**
 * Shared authenticated fetch helper for all client-side pages.
 * Reads the Railway JWT from localStorage and attaches it as a Bearer token.
 */
import { getToken } from "@/lib/railway/token";

export function getAuthToken(): string | null {
  return getToken();
}

/**
 * Fetch with the Railway JWT attached. Throws if not logged in.
 */
export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token = getToken();
  if (!token) throw new Error("Please log in first.");

  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}
