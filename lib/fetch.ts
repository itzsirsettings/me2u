"use client";

import { getToken, getCsrfHeaderValue } from "@/lib/railway/token";

const DEFAULT_TIMEOUT_MS = 30_000;

export function getAuthToken(): string | null {
  return getToken();
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

export function authHeaders(init?: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {};
  if (init?.headers) {
    const raw = init.headers;
    if (raw instanceof Headers) {
      raw.forEach((v, k) => (headers[k] = v));
    } else if (Array.isArray(raw)) {
      for (const [k, v] of raw as Array<[string, string]>) headers[k] = v;
    } else {
      Object.assign(headers, raw);
    }
  }

  const bearer = getToken();
  if (bearer) {
    headers["Authorization"] = `Bearer ${bearer}`;
  }

  const csrf = csrfFromCookie();
  if (csrf && !headers["x-csrf-token"] && !headers["X-CSRF-Token"]) {
    headers["x-csrf-token"] = csrf;
  }

  return headers;
}

export class FetchTimeoutError extends Error {
  public readonly cause?: unknown;
  constructor(message = "Request timed out", options?: ErrorOptions) {
    super(message, options);
    this.name = "FetchTimeoutError";
  }
}

export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: { timeoutMs?: number } = {},
): Promise<Response> {
  const headers = authHeaders(init);
  const method = String(init.method || "GET").toUpperCase();
  if (method !== "GET" && !headers["Content-Type"]) {
    const hasBody = init.body !== undefined && init.body !== null;
    const isFormData =
      hasBody && typeof FormData !== "undefined" && init.body instanceof FormData;
    if (hasBody && !isFormData) {
      headers["Content-Type"] = "application/json";
    }
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let timeoutController: AbortController | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const existingSignal = init.signal;

  if (typeof AbortController !== "undefined") {
    try {
      timeoutController = new AbortController();
      timeoutId = setTimeout(() => {
        if (timeoutController && !timeoutController.signal.aborted) {
          timeoutController.abort(
            new FetchTimeoutError(`Request timed out after ${timeoutMs}ms`),
          );
        }
      }, timeoutMs);

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
    const finalInit: RequestInit = {
      ...init,
      headers,
      credentials: "include",
      signal: timeoutController?.signal ?? existingSignal ?? undefined,
    };

    const response = await fetch(input, finalInit);
    return response;
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "AbortError" || error.message.includes("aborted"))
    ) {
      throw error;
    }
    if (error instanceof FetchTimeoutError) {
      throw error;
    }
    throw error;
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

export function makeEffectController(): {
  signal: AbortSignal;
  cancel: () => void;
} {
  if (typeof AbortController === "undefined") {
    let cancelled = false;
    return {
      signal: {
        get aborted() {
          return cancelled;
        },
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return false;
        },
        onabort: null,
        throwIfAborted() {
          if (cancelled) {
            throw new DOMException("Aborted", "AbortError");
          }
        },
      } as unknown as AbortSignal,
      cancel: () => {
        cancelled = true;
      },
    };
  }

  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: () => {
      try {
        controller.abort(new DOMException("Component unmounted", "AbortError"));
      } catch {
      }
    },
  };
}

export function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof Error) {
    if (err.message.includes("aborted") || err.message.includes("Abort")) return true;
  }
  return false;
}
