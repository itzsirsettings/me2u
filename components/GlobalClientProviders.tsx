"use client";

import { useEffect, ReactNode } from "react";
import { toast } from "sonner";

export default function GlobalClientProviders(): ReactNode {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      try {
        event.preventDefault();
      } catch {
      }

      const reason = event.reason;
      let message = "Unexpected error. Please try again.";

      if (reason instanceof Error) {
        if (
          reason.name === "AbortError" ||
          reason.message.includes("Abort") ||
          reason.message.includes("aborted")
        ) {
          return;
        }
        message = reason.message;
      } else if (typeof reason === "string") {
        message = reason;
      }

      try {
        console.error("Unhandled promise rejection:", reason);
      } catch {
      }

      try {
        toast.error(message);
      } catch {
      }
    };

    const handleError = (event: ErrorEvent): void => {
      try {
        event.preventDefault();
      } catch {
      }
      try {
        console.error("Global error:", event.error || event.message);
      } catch {
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
