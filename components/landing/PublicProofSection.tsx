"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import SuccessStoryCarousel from "./SuccessStoryCarousel";

import { GlowCard } from "@/components/ui/spotlight-card";

type PlatformMetrics = {
  totalBorrowed: number;
  totalRepaid: number;
  activeCircles: number;
  totalUsers: number;
};

type StatsResponse = {
  ok?: boolean;
  stats?: Partial<Record<keyof PlatformMetrics, unknown>>;
};

const defaultMetrics: PlatformMetrics = {
  totalBorrowed: 0,
  totalRepaid: 0,
  activeCircles: 0,
  totalUsers: 0,
};

function formatMetric(value: number, type: "money" | "count" = "count") {
  if (type === "money") {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  }

  return new Intl.NumberFormat("en-NG").format(Math.round(value));
}

type ProofCard = {
  label: string;
  value: string;
  detail: string;
};

function buildProofCards(metrics: PlatformMetrics): ProofCard[] {
  const candidates: Array<ProofCard & { raw: number }> = [
    {
      label: "Total Borrowed",
      raw: metrics.totalBorrowed,
      value: formatMetric(metrics.totalBorrowed, "money"),
      detail: "Borrowed by the Me2U community through fair, 0% interest loans.",
    },
    {
      label: "Successfully Repaid",
      raw: metrics.totalRepaid,
      value: formatMetric(metrics.totalRepaid, "money"),
      detail: "Repayments completed by trusted members across every circle.",
    },
    {
      label: "Trusted Members",
      raw: metrics.totalUsers,
      value: formatMetric(metrics.totalUsers),
      detail: "Verified people building financial trust on Me2U.",
    },
    {
      label: "Active Circles",
      raw: metrics.activeCircles,
      value: formatMetric(metrics.activeCircles),
      detail: "Community groups lending and saving together.",
    },
  ];

  return candidates
    .filter((card) => card.raw > 0)
    .map(({ label, value, detail }) => ({ label, value, detail }));
}

export default function PublicProofSection() {
  const [metrics, setMetrics] = useState<PlatformMetrics>(defaultMetrics);
  const proofCards = useMemo(() => buildProofCards(metrics), [metrics]);

  useEffect(() => {
    let cancelled = false;

    const loadMetrics = () => {
      fetch("/api/platform/stats", { cache: "no-store" })
        .then((response) => response.json() as Promise<StatsResponse>)
        .then((data) => {
          if (cancelled || !data.ok || !data.stats) {
            return;
          }
          const stats = data.stats;
          setMetrics({
            totalBorrowed: Number(stats.totalBorrowed) || 0,
            totalRepaid: Number(stats.totalRepaid) || 0,
            activeCircles: Number(stats.activeCircles) || 0,
            totalUsers: Number(stats.totalUsers) || 0,
          });
        })
        .catch(() => {
          // Stats stay hidden rather than showing empty placeholders.
        });
    };

    loadMetrics();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className="relative overflow-hidden border-t border-[var(--color-border)] bg-[var(--landing-proof-bg)] py-24 text-foreground md:py-32"
      aria-label="Community statistics and user testimonials"
    >
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[20%] left-[-10%] w-[800px] h-[800px] bg-green/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight leading-[1.05]">
              Real numbers. <br />
              <span className="text-[var(--landing-accent-strong)]">Never inflated.</span>
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed tracking-tight max-w-2xl">
              Me2U shares the community&apos;s actual activity — real loans, real repayments,
              real people. No inflated metrics, no estimates.
            </p>
          </motion.div>
        </div>

        {proofCards.length > 0 ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 md:mb-24"
            role="list"
          >
            {proofCards.map((card, index) => (
              <motion.div
                key={card.label}
                role="listitem"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group"
              >
                <GlowCard
                  customSize
                  glowColor="green"
                  className="h-full rounded-2xl border border-[var(--color-border)] bg-[var(--landing-proof-card)] p-6 text-card-foreground shadow-[0_1rem_2rem_-1rem_rgba(8,19,32,0.05)]"
                >
                  <div className="text-sm font-bold text-muted-foreground mb-6 group-hover:text-green transition-colors tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">
                    {card.label}
                  </h3>
                  <p className="text-3xl font-black text-card-foreground mb-4 tracking-tighter tabular-nums">
                    {card.value}
                  </p>
                  <div
                    className="w-full h-px bg-[var(--color-border)] group-hover:bg-green/30 transition-all duration-500 mb-4"
                    aria-hidden="true"
                  />
                  <p className="text-[13px] text-muted-foreground font-medium leading-relaxed">
                    {card.detail}
                  </p>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        ) : null}

        <div className="mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
              Real stories from <br />
              <span className="text-[var(--landing-accent-strong)]">real users.</span>
            </h2>
            <p className="text-lg text-muted-foreground font-medium leading-relaxed max-w-2xl">
              Hear from verified Me2U members who have borrowed and repaid interest-free loans.
            </p>
          </motion.div>
          <SuccessStoryCarousel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="h-full"
          >
            <GlowCard
              customSize
              glowColor="green"
              className="h-full rounded-3xl border border-[var(--color-border)] bg-[var(--landing-proof-card)] p-8 text-card-foreground shadow-[0_1rem_2rem_-1rem_rgba(8,19,32,0.05)] transition-colors duration-500 hover:bg-card md:p-12"
            >
              <h2 className="text-3xl md:text-4xl font-black mb-8 leading-tight">
                Trust built on <br />
                <span className="text-[var(--landing-accent-strong)]">transparency.</span>
              </h2>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed mb-0">
                Every figure on this page reflects what the Me2U community has actually achieved
                — no inflated metrics, no vanity numbers, no estimates.
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
            <GlowCard
              customSize
              glowColor="green"
              className="h-full rounded-3xl border border-[var(--color-border)] bg-[var(--landing-proof-card)] p-8 text-card-foreground shadow-[0_1rem_2rem_-1rem_rgba(8,19,32,0.05)] transition-colors duration-500 hover:bg-card md:p-12"
            >
              <h2 className="text-3xl md:text-4xl font-black mb-8 leading-tight">
                Use Me2U anywhere. <br />
                <span className="text-[var(--landing-accent-strong)]">
                  No app store needed.
                </span>
              </h2>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed mb-12">
                Me2U runs in any modern browser on your phone, tablet, or computer. Add it to
                your home screen in one tap for the full-app experience — nothing to download,
                nothing to wait for.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="btn-primary px-8 py-4 text-base shadow-xl shadow-green/10"
                >
                  Use Web Wallet
                </Link>
                <div className="px-6 py-4 bg-secondary border border-[var(--color-border)] text-muted-foreground rounded-2xl font-bold flex items-center gap-3">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <circle cx="9" cy="9" r="8" fill="var(--color-green)" opacity="0.15" />
                    <path
                      d="M5.5 9.5l2.5 2.5 4.5-5"
                      stroke="var(--color-green)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Works on any device
                </div>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
