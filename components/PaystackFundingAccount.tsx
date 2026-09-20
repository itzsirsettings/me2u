"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Me2uIcon from "@/components/Me2uIcon";
import { authorizedFetch } from "@/lib/fetch";

type FundingAccount = {
  status?: string;
  provider?: string;
  account_name?: string | null;
  account_number?: string | null;
  bank_name?: string | null;
  message?: string;
};

export default function PaystackFundingAccount() {
  const [account, setAccount] = useState<FundingAccount | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAccount = async () => {
    setLoading(true);
    try {
      const response = await authorizedFetch("/api/wallet/virtual-account");
      const data = (await response.json()) as FundingAccount & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Funding account is unavailable.");
      }
      setAccount(data);
    } catch (error) {
      setAccount({
        status: "unavailable",
        message: error instanceof Error ? error.message : "Funding account is unavailable.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccount().catch(() => {});
  }, []);

  const hasAccount = Boolean(account?.account_number);
  return (
    <div className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3.5">
      <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold leading-none">Me2U Wallet Account</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
            {hasAccount
              ? "Transfer to your dedicated account. Bank notifications and backend verification credit your Me2U ledger automatically."
              : "Your dedicated funding account is checked after KYC. No shared platform account details are shown in the wallet."}
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[5px] bg-[var(--color-bg-card)] text-[var(--color-accent-primary)]">
          <Me2uIcon name="bank" size={21} />
        </span>
      </div>

      {hasAccount ? (
        <div className="grid gap-2 text-sm">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="shrink-0 text-[var(--color-text-secondary)]">Bank</span>
            <span className="overflow-anywhere min-w-0 text-right font-semibold">
              {account?.bank_name}
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="shrink-0 text-[var(--color-text-secondary)]">Account Name</span>
            <span className="overflow-anywhere min-w-0 text-right font-semibold">
              {account?.account_name}
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="shrink-0 text-[var(--color-text-secondary)]">Account Number</span>
            <span className="overflow-anywhere min-w-0 text-right font-mono font-black">
              {account?.account_number}
            </span>
          </div>
        </div>
      ) : (
        <p className="rounded-[5px] bg-[var(--color-bg-card)] p-3 text-sm text-[var(--color-text-secondary)]">
          {loading
            ? "Loading funding account..."
            : account?.message || "Funding account is not ready yet."}
        </p>
      )}

      <button
        type="button"
        className="btn-ghost mt-3 min-h-10 w-full text-xs font-bold"
        disabled={loading}
        onClick={async () => {
          await loadAccount();
          toast.success("Funding account status refreshed.");
        }}
      >
        {loading ? "Checking..." : "Requery Wallet Account"}
      </button>
    </div>
  );
}
