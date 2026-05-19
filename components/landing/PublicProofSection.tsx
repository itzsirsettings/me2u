"use client";

import { motion } from "framer-motion";

const proofCards = [
  {
    label: "Processed safely",
    value: "Live total required",
    detail: "Requires an audited aggregate before a currency total is published.",
  },
  {
    label: "Verified wallets",
    value: "Live total required",
    detail: "KYC-approved profiles, not marketing estimates.",
  },
  {
    label: "Loans completed",
    value: "Live total required",
    detail: "Completed loan records from the app ledger.",
  },
  {
    label: "Users rewarded",
    value: "Live total required",
    detail: "Requires distinct rewarded-user aggregation before publishing.",
  },
  {
    label: "Referrals paid",
    value: "Live total required",
    detail: "Verified referral reward payouts.",
  },
  {
    label: "Successful repayments",
    value: "Live total required",
    detail: "Repayment records confirmed in wallet history.",
  },
];

export default function PublicProofSection() {
  return (
    <section className="py-24 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border-t border-[var(--color-border)]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-2 bg-[var(--color-positive-bg)] text-[var(--color-positive-text)] font-bold text-sm rounded-[50px] mb-6">
              Public proof
            </span>
            <h2 className="text-3xl md:text-5xl font-display font-extrabold mb-6 tracking-tight text-[var(--color-text-primary)]">
              Real trust numbers, never inflated.
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)] font-sans font-medium">
              Me2U should publish only live, audited app totals. If a number is not connected yet, it stays marked as a live total requirement.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
          {proofCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[50px] p-8 shadow-[2px_2px_0px_var(--color-shadow)] transition-all hover:-translate-y-1 hover:shadow-none"
            >
              <span className="text-[var(--color-accent-primary)] font-bold text-xl mb-4 block">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">{card.label}</h3>
              <p className="text-[var(--color-positive-text)] font-bold mb-4">{card.value}</p>
              <p className="text-sm text-[var(--color-text-secondary)] font-medium">{card.detail}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[50px] p-10 md:p-12 shadow-[2px_2px_0px_var(--color-shadow)]"
          >
            <span className="inline-block px-4 py-2 bg-[var(--color-hover-soft)] text-[var(--color-accent-primary)] font-bold text-sm rounded-[50px] mb-6">
              Success stories
            </span>
            <h2 className="text-3xl font-display font-extrabold text-[var(--color-text-primary)] mb-6">Testimonials only after real consent.</h2>
            <p className="text-[var(--color-text-secondary)] font-sans font-medium leading-relaxed">
              User stories should come from verified borrowers, lenders, referrers, and savers who agree to be featured. Until then, Me2U should leave this section as a consent-based publishing queue instead of inventing quotes.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[50px] p-10 md:p-12 shadow-[2px_2px_0px_var(--color-shadow)]"
          >
            <span className="inline-block px-4 py-2 bg-[var(--color-positive-bg)] text-[var(--color-positive-text)] font-bold text-sm rounded-[50px] mb-6">
              Native app readiness
            </span>
            <h2 className="text-3xl font-display font-extrabold text-[var(--color-text-primary)] mb-6">Install now, stores when approved.</h2>
            <p className="text-[var(--color-text-secondary)] font-sans font-medium leading-relaxed mb-8">
              Me2U is PWA-ready for supported browsers. Android, iPhone, push notifications, ratings, and store listings should launch only when the production app, compliance notices, and approved store assets are ready.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="px-6 py-3 bg-[var(--color-accent-primary)] text-[var(--color-on-accent)] hover:opacity-90 rounded-[50px] font-bold transition-opacity flex items-center gap-3">
                <span>↗</span> Start with Web app
              </button>
              <button className="px-6 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-not-allowed rounded-[50px] font-bold flex items-center gap-3">
                <span>◎</span> Prepare for App stores
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
