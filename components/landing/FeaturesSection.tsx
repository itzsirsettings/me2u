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
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight"
          >
            Everything builds trust before you borrow or lend.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-600 font-medium"
          >
            Me2U turns account creation into a clear trust flow: registration deposit, payment proof, KYC, welcome bonus, and wallet access.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 font-medium leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
