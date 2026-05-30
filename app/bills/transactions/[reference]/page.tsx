"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Icons8Icon from "@/components/Icons8Icon";
import { backendFetch } from "@/lib/backend-api";
import { useStore } from "@/lib/store";

type BillTransaction = {
  reference: string;
  provider: string;
  provider_reference: string | null;
  category: string;
  network: string | null;
  customer_identifier: string;
  selling_price: number;
  status: "initiated" | "debited" | "pending" | "successful" | "failed" | "reversed" | "refunded";
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  product?: { name: string; network: string | null } | null;
};

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function statusTone(status: BillTransaction["status"]) {
  if (status === "successful") return "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]";
  if (status === "pending" || status === "debited" || status === "initiated") return "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]";
  return "bg-[var(--color-negative-bg)] text-[var(--color-negative-text)]";
}

export default function BillReceiptPage() {
  const params = useParams<{ reference: string }>();
  const router = useRouter();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const [mounted, setMounted] = useState(false);
  const [transaction, setTransaction] = useState<BillTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [requerying, setRequerying] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, isLoading, mounted, router]);

  const loadTransaction = async () => {
    setLoading(true);
    try {
      const data = await backendFetch<BillTransaction>(`/api/bills/transactions/${params.reference}`);
      setTransaction(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load receipt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && isAuthenticated && params.reference) loadTransaction().catch(() => {});
  }, [mounted, isAuthenticated, params.reference]);

  async function requery() {
    setRequerying(true);
    try {
      await backendFetch(`/api/bills/requery/${params.reference}`, { method: "POST", body: JSON.stringify({}) });
      toast.success("Requery queued.");
      await loadTransaction();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to requery transaction.");
    } finally {
      setRequerying(false);
    }
  }

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  return (
    <main className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[4.85rem] md:max-w-2xl md:px-6 md:py-24">
      <section className="mobile-soft-card rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-8">
        <div className="mb-5 flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-black leading-none">Bill Receipt</h1>
            <p className="mt-2 break-all text-sm text-[var(--color-text-secondary)]">{params.reference}</p>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[5px] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
            <Icons8Icon name="receipt" size={25} />
          </span>
        </div>

        {loading ? (
          <p className="rounded-[5px] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-secondary)]">Loading receipt...</p>
        ) : transaction ? (
          <div className="grid gap-3">
            <div className={`rounded-[5px] p-3 text-sm font-black uppercase ${statusTone(transaction.status)}`}>
              {transaction.status}
            </div>
            {[
              ["Product", transaction.product?.name || transaction.category],
              ["Network", transaction.network || transaction.product?.network || "Not set"],
              ["Customer", transaction.customer_identifier],
              ["Amount", money(Number(transaction.selling_price))],
              ["Provider", transaction.provider],
              ["Provider reference", transaction.provider_reference || "Pending"],
              ["Created", new Date(transaction.created_at).toLocaleString("en-NG")],
            ].map(([label, value]) => (
              <div key={label} className="flex min-w-0 items-center justify-between gap-3 rounded-[5px] bg-[var(--color-bg-secondary)] p-3 text-sm">
                <span className="shrink-0 text-[var(--color-text-secondary)]">{label}</span>
                <span className="overflow-anywhere min-w-0 text-right font-semibold">{value}</span>
              </div>
            ))}
            {transaction.failure_reason ? (
              <p className="rounded-[5px] bg-[var(--color-negative-bg)] p-3 text-sm font-semibold text-[var(--color-negative-text)]">
                {transaction.failure_reason}
              </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" className="btn-ghost min-h-11 w-full text-sm font-bold" onClick={() => router.push("/bills")}>
                Back to Bills
              </button>
              <button type="button" className="btn-primary min-h-11 w-full text-sm font-bold" disabled={requerying} onClick={requery}>
                {requerying ? "Requerying..." : "Requery Status"}
              </button>
            </div>
          </div>
        ) : (
          <p className="rounded-[5px] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-secondary)]">Receipt not found.</p>
        )}
      </section>
    </main>
  );
}
