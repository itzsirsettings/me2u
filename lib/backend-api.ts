"use client";

import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

const missingConfigError = "Supabase is not configured. Add the keys from .env.example.";

function backendBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
}

export async function backendFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!hasSupabaseConfig()) throw new Error(missingConfigError);

  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw new Error(error.message);
  if (!session?.access_token) throw new Error("Please log in first.");

  const base = backendBaseUrl();
  if (!base) {
    throw new Error("Bills API is not configured. Set NEXT_PUBLIC_API_BASE_URL.");
  }

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.message === "string" ? data.message : typeof data.error === "string" ? data.error : "Request failed.");
  }

  return data as T;
}
