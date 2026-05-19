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
    <section className="py-24 bg-slate-900 text-white border-t border-slate-800">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-2 bg-white/10 text-emerald-400 font-bold text-sm rounded-full mb-6">
              Public proof
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6 tracking-tight">
              Real trust numbers, never inflated.
            </h2>
            <p className="text-lg text-slate-400 font-medium">
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
              className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors"
            >
              <span className="text-blue-400 font-bold text-xl mb-4 block">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-xl font-bold text-white mb-2">{card.label}</h3>
              <p className="text-emerald-400 font-bold mb-4">{card.value}</p>
              <p className="text-sm text-slate-400 font-medium">{card.detail}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 md:p-12"
          >
            <span className="inline-block px-4 py-2 bg-blue-500/20 text-blue-400 font-bold text-sm rounded-full mb-6">
              Success stories
            </span>
            <h2 className="text-3xl font-extrabold mb-6">Testimonials only after real consent.</h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              User stories should come from verified borrowers, lenders, referrers, and savers who agree to be featured. Until then, Me2U should leave this section as a consent-based publishing queue instead of inventing quotes.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 md:p-12"
          >
            <span className="inline-block px-4 py-2 bg-emerald-500/20 text-emerald-400 font-bold text-sm rounded-full mb-6">
              Native app readiness
            </span>
            <h2 className="text-3xl font-extrabold mb-6">Install now, stores when approved.</h2>
            <p className="text-slate-400 font-medium leading-relaxed mb-8">
              Me2U is PWA-ready for supported browsers. Android, iPhone, push notifications, ratings, and store listings should launch only when the production app, compliance notices, and approved store assets are ready.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors flex items-center gap-3">
                <span>↗</span> Start with Web app
              </button>
              <button className="px-6 py-3 bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed rounded-xl font-bold flex items-center gap-3">
                <span>◎</span> Prepare for App stores
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
