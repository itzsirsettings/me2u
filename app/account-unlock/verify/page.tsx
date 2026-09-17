"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authorizedFetch } from "@/lib/fetch";
import { motion } from "framer-motion";
import Me2uIcon from "@/components/Me2uIcon";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("Verifying your payment...");

  useEffect(() => {
    if (reference) {
      verifyPayment(reference);
    } else {
      setStatus("failed");
      setMessage("No payment reference found.");
    }
  }, [reference]);

  async function verifyPayment(ref: string) {
    try {
      const res = await authorizedFetch("/api/account/unlock", {
        method: "POST",
        body: JSON.stringify({ action: "verify", reference: ref }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Payment verification failed");
      }

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage("Your account has been unlocked successfully!");
        
        // Redirect to wallet after 3 seconds
        setTimeout(() => {
          router.push("/wallet");
        }, 3000);
      } else {
        setStatus("failed");
        setMessage(data.status || "Payment was not successful.");
      }
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Failed to verify payment");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg-primary)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl bg-[var(--color-bg-card)] border-2 border-[var(--color-border)] shadow-[8px_8px_0px_var(--color-shadow)] p-8 text-center"
      >
        {status === "verifying" && (
          <>
            <div className="h-16 w-16 mx-auto mb-6 animate-spin rounded-full border-4 border-[var(--color-accent-primary)] border-t-transparent" />
            <h1 className="text-2xl font-display font-bold mb-2">Verifying Payment</h1>
            <p className="text-[var(--color-text-secondary)]">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="h-16 w-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-green-500/20 text-green-500">
              <Me2uIcon name="check" size={32} />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2 text-green-600 dark:text-green-400">
              Account Unlocked! 🎉
            </h1>
            <p className="text-[var(--color-text-secondary)] mb-6">{message}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Redirecting to your wallet...
            </p>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="h-16 w-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-red-500/20 text-red-500">
              <Me2uIcon name="alert" size={32} />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2 text-red-600 dark:text-red-400">
              Payment Failed
            </h1>
            <p className="text-[var(--color-text-secondary)] mb-6">{message}</p>
            <button
              onClick={() => router.push("/wallet")}
              className="btn-primary px-6 py-3 rounded-xl font-bold"
            >
              Go to Wallet
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function AccountUnlockVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg-primary)]">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--color-accent-primary)] border-t-transparent" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
