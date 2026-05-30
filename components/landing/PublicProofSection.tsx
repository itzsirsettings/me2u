"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GlowCard } from "@/components/ui/spotlight-card";

type PlatformMetrics = {
  processedAmount: number;
  totalUsers: number;
  activeUsers: number;
  verifiedWallets: number;
  completedLoans: number;
  usersRewarded: number;
  referralsPaid: number;
  successfulRepayments: number;
};

const defaultMetrics: PlatformMetrics = {
  processedAmount: 0,
  totalUsers: 0,
  activeUsers: 0,
  verifiedWallets: 0,
  completedLoans: 0,
  usersRewarded: 0,
  referralsPaid: 0,
  successfulRepayments: 0,
};

function formatMetric(value: number, type: "money" | "count" = "count") {
  if (type === "money") {
    return `₦${Math.round(value).toLocaleString("en-NG")}`;
  }

  return Math.round(value).toLocaleString("en-NG");
}

function buildProofCards(metrics: PlatformMetrics) {
  return [
  {
    label: "Processed safely",
      value: formatMetric(metrics.processedAmount, "money"),
      detail: "Audited from wallet, loan, bill, savings, and repayment records.",
  },
  {
      label: "Active users",
      value: formatMetric(metrics.activeUsers),
      detail: "Users with wallet activity in the last 30 days.",
    },
    {
    label: "Verified wallets",
      value: formatMetric(metrics.verifiedWallets),
      detail: "KYC-approved profiles, not marketing estimates.",
  },
  {
    label: "Loans completed",
      value: formatMetric(metrics.completedLoans),
    detail: "Completed loan records from the app ledger.",
  },
  {
    label: "Users rewarded",
      value: formatMetric(metrics.usersRewarded),
    detail: "Requires distinct rewarded-user aggregation before publishing.",
  },
  {
    label: "Referrals paid",
      value: formatMetric(metrics.referralsPaid),
    detail: "Verified referral reward payouts.",
  },
  {
    label: "Successful repayments",
      value: formatMetric(metrics.successfulRepayments),
    detail: "Repayment records confirmed in wallet history.",
  },
  ];
}

export default function PublicProofSection() {
  const [metrics, setMetrics] = useState<PlatformMetrics>(defaultMetrics);
  const [loaded, setLoaded] = useState(false);
  const proofCards = useMemo(() => buildProofCards(metrics), [metrics]);

  useEffect(() => {
    let cancelled = false;

    const loadMetrics = () => {
      fetch("/api/platform/metrics", { cache: "no-store" })
        .then((response) => response.json())
        .then((data) => {
          if (!cancelled && data.ok && data.metrics) {
            setMetrics({ ...defaultMetrics, ...data.metrics });
            setLoaded(true);
          }
        })
        .catch(() => {
          if (!cancelled) setLoaded(true);
        });
    };

    loadMetrics();
    const interval = window.setInterval(loadMetrics, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className="relative overflow-hidden border-t border-[var(--color-border)] bg-[var(--landing-proof-bg)] py-40 text-foreground">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[20%] left-[-10%] w-[800px] h-[800px] bg-green/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight leading-[1.05]">
              Real trust numbers, <br/>
              <span className="text-[var(--landing-accent-strong)]">never inflated.</span>
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed tracking-tight max-w-2xl">
              Me2U publishes live data from the production ledger. Current user count: <span className="text-foreground font-bold">{loaded ? formatMetric(metrics.totalUsers) : "syncing..."}</span>
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-40">
          {proofCards.slice(0, 4).map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="group"
            >
              <GlowCard customSize glowColor="green" className="h-full rounded-2xl border border-[var(--color-border)] bg-[var(--landing-proof-card)] p-6 text-card-foreground shadow-[0_1rem_2rem_-1rem_rgba(8,19,32,0.05)]">
                <div className="text-sm font-bold text-muted-foreground mb-6 group-hover:text-green transition-colors">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">{card.label}</h3>
                <p className="text-3xl font-black text-card-foreground mb-4 tracking-tighter">{card.value}</p>
                <div className="w-full h-px bg-[var(--color-border)] group-hover:bg-green/30 transition-all duration-500 mb-4" />
                <p className="text-[13px] text-muted-foreground font-medium leading-relaxed">{card.detail}</p>
              </GlowCard>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="h-full"
          >
            <GlowCard customSize glowColor="green" className="h-full rounded-[3rem] border border-[var(--color-border)] bg-[var(--landing-proof-card)] p-12 text-card-foreground shadow-[0_1rem_2rem_-1rem_rgba(8,19,32,0.05)] transition-colors duration-500 hover:bg-card md:p-16">
              <h2 className="text-3xl md:text-4xl font-black mb-8 leading-tight">Testimonials only after <br/><span className="text-[var(--landing-accent-strong)]">real consent.</span></h2>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed mb-0">
                User stories come exclusively from verified participants who agree to be featured. We maintain this as a consent-driven space, prioritizing privacy over marketing hype.
              </p>
            </GlowCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="h-full"
          >
            <GlowCard customSize glowColor="green" className="h-full rounded-[3rem] border border-[var(--color-border)] bg-[var(--landing-proof-card)] p-12 text-card-foreground shadow-[0_1rem_2rem_-1rem_rgba(8,19,32,0.05)] transition-colors duration-500 hover:bg-card md:p-16">
              <h2 className="text-3xl md:text-4xl font-black mb-8 leading-tight">Install now, stores <br/><span className="text-[var(--landing-accent-strong)]">when approved.</span></h2>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed mb-12">
                Me2U is PWA-ready for all modern browsers. Native app store distribution follows our strict compliance and security audit cycle.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register" className="btn-primary px-8 py-4 text-base shadow-xl shadow-green/10">
                  Use Web Wallet
                </Link>
                <div className="px-8 py-4 bg-secondary border border-[var(--color-border)] text-muted-foreground rounded-2xl font-bold flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-green animate-pulse" />
                  Store Approval Pending
                </div>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
