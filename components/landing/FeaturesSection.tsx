"use client";

import { motion } from "framer-motion";

const features = [
  {
    icon: "↗",
    title: "Registration deposit",
    description: "Pay the fixed ₦1,000 deposit and upload your transfer reference plus receipt."
  },
  {
    icon: "⌁",
    title: "Welcome bonus",
    description: "₦2,000 wallet bonus after KYC approval."
  },
  {
    icon: "◈",
    title: "Me2U Trust Score",
    description: "Improve limits through KYC, repayments, wallet activity, referrals, and account age."
  },
  {
    icon: "⚡",
    title: "Bills and utilities",
    description: "Use the wallet for airtime, data, electricity, cable TV, school fees, and payment links."
  },
  {
    icon: "◎",
    title: "Savings goals",
    description: "Create emergency, rent, school fee, business capital, and group savings goals."
  },
  {
    icon: "✦",
    title: "Referral Rewards",
    description: "Earn ₦500 when direct referrals complete onboarding."
  },
  {
    icon: "◇",
    title: "Top deals",
    description: "Merchant deals from verified food, pharmacy, transport, school, and training businesses."
  },
  {
    icon: "▣",
    title: "Me2U Circles",
    description: "Create private lending groups for families, schools, churches, traders, and businesses."
  },
  {
    icon: "▰",
    title: "Protected lending",
    description: "Review agreement summaries, repayment countdowns, receipts, and dispute evidence."
  },
  {
    icon: "⌘",
    title: "Global profile",
    description: "Choose country, currency, and language while lending remains country-gated until local setup is ready."
  }
];

export default function FeaturesSection() {
  return (
    <section className="py-32 bg-white relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black text-slate-950 mb-8 tracking-tight leading-[1.05]"
          >
            Everything builds trust <br/>
            <span className="text-emerald-500">before you borrow.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-slate-500 font-medium max-w-2xl leading-relaxed tracking-tight"
          >
            Me2U turns onboarding into a transparent trust flow. Every step—from deposit to KYC—strengthens your profile.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="group"
            >
              <div className="text-3xl mb-6 text-slate-950 font-light opacity-50 group-hover:opacity-100 group-hover:text-emerald-500 transition-all duration-300">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-950 mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed text-[15px]">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
