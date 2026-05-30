"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Icons8Icon from "@/components/Icons8Icon";
import PaystackFundingAccount from "@/components/PaystackFundingAccount";
import { backendFetch } from "@/lib/backend-api";
import { useStore } from "@/lib/store";

type BillProduct = {
  id: string;
  category?: { slug: string; name: string };
  provider: "vtpass" | "flutterwave";
  service_id: string;
  variation_code: string | null;
  network: string | null;
  name: string;
  selling_price: number;
  is_active: boolean;
};

type BillTransaction = {
  id: string;
  reference: string;
  category: string;
  network: string | null;
  customer_identifier: string;
  selling_price: number;
  status: "initiated" | "debited" | "pending" | "successful" | "failed" | "reversed" | "refunded";
  created_at: string;
  product?: { name: string; network: string | null } | null;
};

const networks = ["MTN", "Airtel", "Glo", "9mobile"];
const categories = [
  { id: "airtime", label: "Buy Airtime", icon: "phone" as const, ready: true },
  { id: "data", label: "Buy Data", icon: "globe" as const, ready: true },
  { id: "electricity", label: "Pay Electricity", icon: "bill" as const, ready: false },
  { id: "cable", label: "Cable TV", icon: "receipt" as const, ready: false },
];

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function statusClass(status: BillTransaction["status"]) {
  if (status === "successful") return "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]";
  if (status === "pending" || status === "debited" || status === "initiated") return "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]";
  return "bg-[var(--color-negative-bg)] text-[var(--color-negative-text)]";
}

export default function BillsPage() {
  const router = useRouter();
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const loadCurrentUser = useStore((state) => state.loadCurrentUser);
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("airtime");
  const [selectedNetwork, setSelectedNetwork] = useState("MTN");
  const [products, setProducts] = useState<BillProduct[]>([]);
  const [transactions, setTransactions] = useState<BillTransaction[]>([]);
  const [productId, setProductId] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, isLoading, mounted, router]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const categorySlug = product.category?.slug;
        return categorySlug === selectedCategory && product.network?.toLowerCase() === selectedNetwork.toLowerCase();
      }),
    [products, selectedCategory, selectedNetwork],
  );

  const selectedProduct = filteredProducts.find((product) => product.id === productId) || filteredProducts[0];
  const isFixedPrice = selectedCategory === "data" || Number(selectedProduct?.selling_price || 0) > 0;
  const payableAmount = isFixedPrice ? Number(selectedProduct?.selling_price || 0) : Number(amount || 0);

  const loadBillsData = async () => {
    setLoadingData(true);
    try {
      const [productRows, transactionRows] = await Promise.all([
        backendFetch<BillProduct[]>("/api/bills/products"),
        backendFetch<BillTransaction[]>("/api/bills/transactions"),
      ]);
      setProducts(productRows);
      setTransactions(transactionRows);
      const firstProduct = productRows.find((item) => item.category?.slug === selectedCategory && item.network === selectedNetwork);
      setProductId((current) => current || firstProduct?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load bills.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (mounted && isAuthenticated) loadBillsData().catch(() => {});
  }, [mounted, isAuthenticated]);

  useEffect(() => {
    const firstProduct = filteredProducts[0];
    setProductId(firstProduct?.id || "");
    if (selectedCategory === "data") setAmount("");
  }, [filteredProducts, selectedCategory]);

  async function submitPurchase() {
    if (!user) return;
    if (!user.kycVerified) {
      toast.error("Complete KYC before paying bills.");
      router.push("/kyc");
      return;
    }
    if (!user.transactionPin) {
      toast.error("Set a transaction PIN first.");
      router.push("/security");
      return;
    }
    if (!selectedProduct) {
      toast.error("Select a bill product.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Enter the recipient phone number.");
      return;
    }
    if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (pin.length !== 4) {
      toast.error("Enter your 4-digit transaction PIN.");
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey = `bill:${selectedProduct.id}:${phone.trim()}:${payableAmount}:${Date.now()}`;
      const transaction = await backendFetch<BillTransaction>("/api/bills/purchase", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          productId: selectedProduct.id,
          amount: payableAmount,
          customerIdentifier: phone.trim(),
          pin,
          idempotencyKey,
        }),
      });

      toast.success("Bill payment submitted.");
      await Promise.all([loadBillsData(), loadCurrentUser()]);
      router.push(`/bills/transactions/${transaction.reference}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to buy bill.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  return (
    <main className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[4.85rem] md:max-w-6xl md:px-6 md:py-24">
      <div className="mb-5 min-w-0 md:mb-8">
        <h1 className="font-display text-3xl font-black leading-none md:text-5xl">Bills & Utilities</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Buy airtime and data from your Me2U wallet with provider tracking, automatic refunds, and trust-score activity.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.55fr)]">
        <section className="mobile-soft-card min-w-0 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[4px_4px_0px_var(--color-shadow)] md:p-6">
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {categories.map((category) => {
              const active = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  disabled={!category.ready}
                  onClick={() => category.ready && setSelectedCategory(category.id)}
                  className={`min-h-20 rounded-[5px] border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${
                    active
                      ? "border-[var(--color-accent-primary)] bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                  }`}
                >
                  <Icons8Icon name={category.icon} size={20} />
                  <span className="mt-2 block text-sm font-black">{category.label}</span>
                  {!category.ready ? <span className="mt-1 block text-[10px] font-bold text-[var(--color-text-secondary)]">Next phase</span> : null}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 rounded-[5px] bg-[var(--color-bg-secondary)] p-3.5">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Network</label>
              <div className="grid grid-cols-4 gap-2">
                {networks.map((network) => (
                  <button
                    key={network}
                    type="button"
                    onClick={() => setSelectedNetwork(network)}
                    className={`min-h-10 rounded-[5px] border px-2 text-xs font-black ${
                      selectedNetwork === network
                        ? "border-[var(--color-accent-primary)] bg-[var(--color-bg-card)] text-[var(--color-accent-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)]"
                    }`}
                  >
                    {network}
                  </button>
                ))}
              </div>
            </div>

            {selectedCategory === "data" ? (
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Data plan</label>
                <select
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  className="h-12 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                >
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {money(Number(product.selling_price || 0))}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Phone number</label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                placeholder="08012345678"
                className="h-12 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Amount</label>
              <input
                value={isFixedPrice ? money(payableAmount) : amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={isFixedPrice}
                inputMode="decimal"
                placeholder="500"
                className="h-12 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 font-mono text-sm outline-none disabled:opacity-75 focus:ring-2 focus:ring-[var(--color-accent-primary)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Transaction PIN</label>
              <input
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                type="password"
                inputMode="numeric"
                placeholder="...."
                className="h-12 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-center font-mono text-lg tracking-[0.4em] outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
              />
            </div>

            <button
              type="button"
              disabled={submitting || loadingData || !selectedProduct}
              onClick={submitPurchase}
              className="btn-primary min-h-12 w-full text-sm font-black disabled:opacity-55"
            >
              {submitting ? "Processing..." : `Pay from Me2U Wallet ${payableAmount > 0 ? money(payableAmount) : ""}`}
            </button>
          </div>
        </section>

        <aside className="grid min-w-0 gap-4">
          <PaystackFundingAccount />

          <section className="mobile-soft-card rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[4px_4px_0px_var(--color-shadow)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-black">Recent Bills</h2>
              <button type="button" className="btn-ghost min-h-9 px-3 text-xs font-bold" onClick={loadBillsData}>
                Refresh
              </button>
            </div>
            <div className="grid gap-2">
              {transactions.length === 0 ? (
                <p className="rounded-[5px] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-secondary)]">
                  No bill transactions yet.
                </p>
              ) : (
                transactions.slice(0, 8).map((transaction) => (
                  <button
                    key={transaction.id}
                    type="button"
                    onClick={() => router.push(`/bills/transactions/${transaction.reference}`)}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-[5px] bg-[var(--color-bg-secondary)] p-3 text-left text-sm"
                  >
                    <span className="min-w-0">
                      <b className="block truncate">{transaction.product?.name || transaction.category}</b>
                      <span className="block truncate text-xs text-[var(--color-text-secondary)]">{transaction.customer_identifier}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <b className="block font-mono">{money(Number(transaction.selling_price))}</b>
                      <span className={`mt-1 inline-block rounded-[5px] px-2 py-0.5 text-[10px] font-black uppercase ${statusClass(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
