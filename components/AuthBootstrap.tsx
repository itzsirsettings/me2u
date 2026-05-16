"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";

export default function AuthBootstrap() {
  const initialize = useStore((state) => state.initialize);

  useEffect(() => {
    initialize();

    if (!hasSupabaseConfig()) return undefined;

    const {
      data: { subscription },
    } = getSupabaseBrowserClient().auth.onAuthStateChange(() => {
      initialize();
    });

    return () => subscription.unsubscribe();
  }, [initialize]);

  return null;
}
