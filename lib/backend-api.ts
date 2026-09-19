"use client";

import { getToken, getCsrfHeaderValue } from "@/lib/railway/token";
import { FetchTimeoutError, isAbortError } from "@/lib/fetch";

function backendBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
}

function csrfFromCookie(): string {
  if (typeof document === "undefined") return "";
  const parts = (document.cookie || "").split(";");
  const CSRF_COOKIE_NAME = "me2u_csrf";
  for (const part of parts) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CSRF_COOKIE_NAME) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return rest.join("=");
      }
    }
  }
  return "";
}

function normalizeHeaders(raw: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  if (raw instanceof Headers) {
    raw.forEach((v, k) => (out[k] = v));
  } else if (Array.isArray(raw)) {
    for (const [k, v] of raw as Array<[string, string]>) out[k] = v;
  } else {
    Object.assign(out, raw);
  }
  return out;
}

const BACKEND_TIMEOUT_MS = 45_000;

export async function backendFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("Please log in first.");

  const base = backendBaseUrl();
  if (!base) {
    throw new Error("Bills API is not configured. Set NEXT_PUBLIC_API_BASE_URL.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...normalizeHeaders(init.headers),
  };
  if (
    init.body &&
    !(typeof FormData !== "undefined" && init.body instanceof FormData) &&
    !headers["Content-Type"] &&
    !headers["content-type"]
  ) {
    headers["Content-Type"] = "application/json";
  }
  let csrf = csrfFromCookie();
  if (!csrf) {
    const saved = getCsrfHeaderValue();
    if (saved) csrf = saved;
  }
  if (csrf && !headers["x-csrf-token"] && !headers["X-CSRF-Token"]) {
    headers["x-csrf-token"] = csrf;
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let timeoutController: AbortController | null = null;
  const existingSignal = init.signal;

  if (typeof AbortController !== "undefined") {
    try {
      timeoutController = new AbortController();
      timeoutId = setTimeout(() => {
        if (timeoutController && !timeoutController.signal.aborted) {
          timeoutController.abort(
            new FetchTimeoutError(`Backend request timed out after ${BACKEND_TIMEOUT_MS}ms`),
          );
        }
      }, BACKEND_TIMEOUT_MS);
      if (existingSignal) {
        existingSignal.addEventListener(
          "abort",
          () => {
            if (timeoutController && !timeoutController.signal.aborted) {
              const reason =
                (existingSignal as unknown as { reason?: unknown }).reason ??
                new DOMException("Aborted", "AbortError");
              timeoutController.abort(reason);
            }
          },
          { once: true },
        );
      }
    } catch {
      timeoutController = null;
    }
  }

  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers,
      credentials: "include",
      signal: timeoutController?.signal ?? existingSignal ?? undefined,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        typeof data.message === "string"
          ? data.message
          : typeof data.error === "string"
            ? data.error
            : "Request failed.",
      );
    }

    return data as T;
  } catch (error) {
    if (isAbortError(error) || error instanceof FetchTimeoutError) throw error;
    throw error;
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}

