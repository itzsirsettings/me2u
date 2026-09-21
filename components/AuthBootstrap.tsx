"use client";

import { useEffect } from "react";

import { authorizedFetch, isAbortError } from "@/lib/fetch";
import { useStore, type User } from "@/lib/store";

export default function AuthBootstrap() {
  const initialize = useStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
    let inFlight = false;
    const controller = new AbortController();
    const refreshProfile = async () => {
      const current = useStore.getState();
      if (document.hidden || inFlight || current.isLoading || !current.user) return;
      const userId = current.user.id;
      inFlight = true;
      try {
        const response = await authorizedFetch("/api/auth/me", { signal: controller.signal });
        if (!response.ok) return; // Keep the last account state during transient failures.
        const data = (await response.json()) as { user?: User };
        if (
          !controller.signal.aborted &&
          data.user?.id === userId &&
          useStore.getState().user?.id === userId
        ) {
          useStore.setState({ user: data.user });
        }
      } catch (error) {
        if (!isAbortError(error)) console.warn("Account refresh unavailable; will retry.");
      } finally {
        inFlight = false;
      }
    };
    const onFocus = () => {
      void refreshProfile();
    };
    const interval = window.setInterval(onFocus, 60_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [initialize]);

  return null;
}
