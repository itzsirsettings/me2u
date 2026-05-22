"use client";

import { motion } from "framer-motion";

const features = [
  {
    icon: "↗",
    title: "Registration deposit",
    description: "Pay the fixed ₦1,000 deposit and upload your transfer reference plus receipt."
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
    description: "Earn ₦500 after referrals complete KYC and their first loan repayment."
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
    <section className="py-32 bg-snow relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-medium text-navy mb-8 tracking-tight leading-[1.2]"
          >
            Everything builds trust <br/>
            <span className="text-green">before you borrow.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-slate-light font-normal max-w-2xl leading-relaxed tracking-tight"
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
              <div className="w-10 h-10 rounded-[10px] bg-green/10 text-green flex items-center justify-center text-xl mb-6 group-hover:bg-green group-hover:text-navy transition-all duration-300">
                {feature.icon}
              </div>
              <h3 className="text-lg font-medium text-navy mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-slate-light font-normal leading-relaxed text-[14px]">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
