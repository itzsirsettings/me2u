"use client";

import { motion, type Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import Me2uIcon from "@/components/Me2uIcon";
import { Card } from "@/components/ui/card";
import { authorizedFetch as _authorizedFetch } from "@/lib/fetch";
import { useStore } from "@/lib/store";
import LoadingButton from "@/LoadingButton";

type MerchantDeal = {
  id: string;
  merchant_name: string;
  category: string;
  title: string;
  description: string;
  discount_percent: number;
  country_code: string;
  active: boolean;
  created_at: string;
};

type MerchantClaim = {
  deal_id: string;
  status: "claimed" | "redeemed" | "expired";
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.44, ease: [0.16, 1, 0.3, 1] } },
};

const categoryColors: Record<string, string> = {
  food: "bg-lime/20 text-[var(--color-warning-text)]",
  tech: "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]",
  fashion: "bg-[var(--mobile-surface-muted)] text-[var(--color-text-secondary)]",
  health: "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]",
  travel: "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]",
  education: "bg-lime/20 text-[var(--color-warning-text)]",
  finance: "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]",
};

function categoryStyle(cat: string) {
  return (
    categoryColors[cat.toLowerCase()] ??
    "bg-[var(--mobile-surface-muted)] text-[var(--color-text-secondary)]"
  );
}

export default function DealsPage() {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const isLoading = useStore((s) => s.isLoading);
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [deals, setDeals] = useState<MerchantDeal[]>([]);
  const [claims, setClaims] = useState<MerchantClaim[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) router.push("/login");
  }, [mounted, isLoading, isAuthenticated, router]);

  async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    return _authorizedFetch(input, init);
  }

  const loadDeals = useCallback(async () => {
    if (!isAuthenticated) return;
    setFetching(true);
    try {
      const res = await authorizedFetch("/api/merchant-deals");
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setDeals(data.deals || []);
        setClaims(data.claims || []);
      }
    } catch {
      // silent
    } finally {
      setFetching(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (mounted && isAuthenticated) loadDeals();
  }, [mounted, isAuthenticated, loadDeals]);

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  const claimedIds = new Set(claims.map((c) => c.deal_id));
  const categories = [
    "all",
    ...Array.from(new Set(deals.map((d) => d.category.toLowerCase()))),
  ];
  const visibleDeals =
    filter === "all" ? deals : deals.filter((d) => d.category.toLowerCase() === filter);

  const handleClaim = async (deal: MerchantDeal) => {
    const res = await authorizedFetch("/api/merchant-deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: deal.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.error(data.error || "Unable to claim deal.");
      throw new Error("claim failed");
    }
    toast.success(`${deal.merchant_name} deal claimed!`);
    await loadDeals();
  };

  const claimedCount = claims.length;
  const unclaimedCount = deals.length - claimedCount;

  return (
    <motion.div
      className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[3.85rem] md:max-w-3xl md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-4 md:mb-10">
        <h1 className="sr-only md:not-sr-only md:text-7xl md:font-display md:leading-[0.85] md:tracking-tighter">
          Deals
        </h1>
      </motion.div>

      {/* Stats strip */}
      <motion.div
        variants={itemVariants}
        className="mobile-soft-card mb-4 grid grid-cols-3 divide-x divide-[var(--color-border)] overflow-hidden rounded-[20px]"
      >
        <div className="flex flex-col items-center justify-center gap-0.5 px-2 py-3">
          <p className="text-[1.1rem] font-black text-[var(--color-text-primary)]">
            {deals.length}
          </p>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Deals
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-0.5 px-2 py-3">
          <p className="text-[1.1rem] font-black text-[var(--color-positive-text)]">
            {claimedCount}
          </p>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Claimed
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-0.5 px-2 py-3">
          <p className="text-[1.1rem] font-black text-[var(--color-text-primary)]">
            {unclaimedCount}
          </p>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Available
          </p>
        </div>
      </motion.div>

      {/* Category filter */}
      {categories.length > 1 && (
        <motion.div
          variants={itemVariants}
          className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-black capitalize transition active:scale-95 ${
                filter === cat
                  ? "bg-[var(--color-accent-primary)] text-[var(--color-on-accent)]"
                  : "bg-[var(--mobile-surface-muted)] text-[var(--color-text-secondary)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>
      )}

      {/* Deals grid */}
      {fetching ? (
        <motion.div variants={itemVariants} className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent-primary)] border-t-transparent" />
        </motion.div>
      ) : visibleDeals.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <Me2uIcon name="deal" size={44} className="text-[var(--color-text-secondary)]" />
            <p className="text-base font-display">
              {deals.length === 0 ? "No deals available yet" : "No deals in this category"}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {deals.length === 0
                ? "Check back soon for exclusive partner discounts."
                : "Try selecting a different category."}
            </p>
            {filter !== "all" && (
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="mt-1 text-sm font-bold text-[var(--color-accent-primary)]"
              >
                Show all deals
              </button>
            )}
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {visibleDeals.map((deal) => {
            const claimed = claimedIds.has(deal.id);
            return (
              <motion.div key={deal.id} variants={itemVariants}>
                <Card className={`p-5 transition ${claimed ? "opacity-70" : ""}`}>
                  <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${categoryStyle(deal.category)}`}
                        >
                          {deal.category}
                        </span>
                        {claimed && (
                          <span className="rounded-full bg-[var(--color-positive-bg)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-positive-text)]">
                            Claimed ✓
                          </span>
                        )}
                      </div>
                      <p className="font-display text-base leading-snug">{deal.title}</p>
                      <p className="mt-0.5 text-sm font-semibold text-[var(--color-text-secondary)]">
                        {deal.merchant_name}
                      </p>
                    </div>
                    {/* Discount badge */}
                    <div className="shrink-0 grid h-14 w-14 place-items-center rounded-full bg-[var(--color-accent-primary)]/10 text-center">
                      <p className="text-lg font-black leading-none text-[var(--color-positive-text)]">
                        {deal.discount_percent}%
                      </p>
                      <p className="text-[9px] font-black uppercase tracking-wider text-[var(--color-positive-text)]">
                        off
                      </p>
                    </div>
                  </div>

                  <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {deal.description}
                  </p>

                  <div className="[&>button]:w-full [&>button]:py-2.5 [&>button]:text-sm">
                    <LoadingButton
                      label={claimed ? "Claimed" : "Claim Deal"}
                      loadingText="Claiming..."
                      successText="Claimed!"
                      disabled={claimed}
                      onClick={() => handleClaim(deal)}
                    />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="h-24" />
    </motion.div>
  );
}
