"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

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
    <section className="py-40 bg-slate-950 text-white border-t border-white/5 relative overflow-hidden">
      {/* Subtle Dark Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[20%] left-[-10%] w-[800px] h-[800px] bg-emerald-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-[10px] font-bold tracking-widest uppercase mb-8">
              Live Transparency
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight leading-[1.05]">
              Real trust numbers, <br/>
              <span className="text-emerald-500">never inflated.</span>
            </h2>
            <p className="text-xl md:text-2xl text-slate-400 font-medium leading-relaxed tracking-tight max-w-2xl">
              Me2U publishes live data from the production ledger. Current user count: <span className="text-white font-bold">{loaded ? formatMetric(metrics.totalUsers) : "syncing..."}</span>
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
              <div className="text-sm font-bold text-slate-500 mb-6 group-hover:text-emerald-500 transition-colors">
                {String(index + 1).padStart(2, "0")}
              </div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{card.label}</h3>
              <p className="text-3xl font-black text-white mb-4 tracking-tighter">{card.value}</p>
              <div className="w-full h-px bg-white/10 group-hover:bg-emerald-500/30 transition-all duration-500 mb-4" />
              <p className="text-[13px] text-slate-500 font-medium leading-relaxed">{card.detail}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/5 border border-white/10 rounded-[3rem] p-12 md:p-16 hover:bg-white/[0.07] transition-all duration-500"
          >
            <h2 className="text-3xl md:text-4xl font-black mb-8 leading-tight">Testimonials only after <br/><span className="text-emerald-500">real consent.</span></h2>
            <p className="text-lg text-slate-400 font-medium leading-relaxed mb-0">
              User stories come exclusively from verified participants who agree to be featured. We maintain this as a consent-driven space, prioritizing privacy over marketing hype.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-[3rem] p-12 md:p-16 hover:bg-white/[0.07] transition-all duration-500"
          >
            <h2 className="text-3xl md:text-4xl font-black mb-8 leading-tight">Install now, stores <br/><span className="text-emerald-500">when approved.</span></h2>
            <p className="text-lg text-slate-400 font-medium leading-relaxed mb-12">
              Me2U is PWA-ready for all modern browsers. Native app store distribution follows our strict compliance and security audit cycle.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/register" className="px-8 py-4 bg-white text-slate-950 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-white/5">
                Use Web Wallet
              </Link>
              <div className="px-8 py-4 bg-white/5 border border-white/10 text-slate-500 rounded-2xl font-bold flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-slate-700 animate-pulse" />
                Store Approval Pending
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
