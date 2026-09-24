"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15" />
    <path d="M6 10l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.1" />
    <path d="M7 7l6 6m0-6l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const comparisonData = [
  {
    feature: "Interest Rate",
    banks: { value: "High", hasIt: false, color: "#EF4444" },
    loanApps: { value: "Very High", hasIt: false, color: "#EF4444" },
    me2u: { value: "0%", hasIt: true, color: "#22C55E" },
  },
  {
    feature: "Fee visibility",
    banks: { value: "Varies", hasIt: true, color: "#F59E0B" },
    loanApps: { value: "Varies", hasIt: true, color: "#F59E0B" },
    me2u: { value: "Shown before action", hasIt: true, color: "#22C55E" },
  },
  {
    feature: "Identity Verification",
    banks: { value: "Complex", hasIt: true, color: "#3B82F6" },
    loanApps: { value: "Basic", hasIt: true, color: "#F59E0B" },
    me2u: { value: "Secure & Simple", hasIt: true, color: "#22C55E" },
  },
  {
    feature: "Community Circles",
    banks: { value: "None", hasIt: false, color: "#94A3B8" },
    loanApps: { value: "None", hasIt: false, color: "#94A3B8" },
    me2u: { value: "Yes", hasIt: true, color: "#22C55E" },
  },
  {
    feature: "Trust Score System",
    banks: { value: "Hidden", hasIt: false, color: "#94A3B8" },
    loanApps: { value: "None", hasIt: false, color: "#94A3B8" },
    me2u: { value: "Transparent", hasIt: true, color: "#22C55E" },
  },
  {
    feature: "Savings Goals",
    banks: { value: "Limited", hasIt: true, color: "#F59E0B" },
    loanApps: { value: "None", hasIt: false, color: "#94A3B8" },
    me2u: { value: "Flexible", hasIt: true, color: "#22C55E" },
  },
  {
    feature: "Referral Rewards",
    banks: { value: "None", hasIt: false, color: "#94A3B8" },
    loanApps: { value: "Limited", hasIt: false, color: "#F59E0B" },
    me2u: { value: "Yes", hasIt: true, color: "#22C55E" },
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

export default function ComparisonSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const shouldReduceMotion = useReducedMotion();

  const variants = shouldReduceMotion ? {} : itemVariants;

  return (
    <section
      ref={sectionRef}
      id="comparison"
      aria-labelledby="comparison-heading"
      className="landing-section bg-[var(--color-bg-primary)]"
    >
      <div className="landing-container">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h2 id="comparison-heading" className="landing-h2 mb-4">
            Why Choose Me2U?
          </h2>
          <p className="landing-body max-w-2xl mx-auto">
            Me2U is built around visible trust signals, interest-free loan pricing, peer participation, and tools for saving and referrals. Always review the terms shown for your specific action.
          </p>
        </motion.div>

        {/* Comparison Table */}
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header Row */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div></div>
              <div className="text-center">
                <h3 className="font-semibold text-base mb-2 text-[var(--color-text-primary)]">
                  Traditional Banks
                </h3>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-base mb-2 text-[var(--color-text-primary)]">
                  Loan Apps
                </h3>
              </div>
              <div className="text-center">
                <div className="inline-block px-4 py-2 rounded-lg bg-green/10 border border-green/20">
                  <h3 className="font-semibold text-base text-green">
                    Me2U
                  </h3>
                </div>
              </div>
            </div>

            {/* Data Rows */}
            <motion.div
              className="space-y-3"
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            >
              {comparisonData.map((row, index) => (
                <motion.div
                  key={row.feature}
                  className="grid grid-cols-4 gap-4 items-center py-4 px-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]"
                  variants={variants}
                >
                  <div className="font-medium text-sm text-[var(--color-text-primary)]">
                    {row.feature}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span style={{ color: row.banks.color }}>
                      {row.banks.hasIt ? <CheckIcon /> : <XIcon />}
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)] hidden sm:inline">
                      {row.banks.value}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span style={{ color: row.loanApps.color }}>
                      {row.loanApps.hasIt ? <CheckIcon /> : <XIcon />}
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)] hidden sm:inline">
                      {row.loanApps.value}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 bg-green/5 rounded-md py-2">
                    <span style={{ color: row.me2u.color }}>
                      {row.me2u.hasIt ? <CheckIcon /> : <XIcon />}
                    </span>
                    <span className="text-xs font-semibold text-green hidden sm:inline">
                      {row.me2u.value}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
