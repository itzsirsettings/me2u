"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const signals = [
  {
    title: "Verified Identity",
    description: "Complete secure identity verification to establish your baseline trust.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 4l8 3v6c0 5-3 9-8 11-5-2-8-6-8-11V7l8-3z" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.1" />
        <path d="M11 16l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "On-Time Repayments",
    description: "Every loan you repay on schedule builds trust and increases your credit level.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <path d="M16 8v8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Active Wallet Use",
    description: "Regular wallet activity shows engagement and responsible financial behavior.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="8" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <path d="M20 16h4v4h-4a2 2 0 010-4z" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.1" />
        <circle cx="20" cy="18" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Verified Referrals",
    description: "Referring trusted friends who complete verification strengthens your network.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="10" r="4" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <path d="M4 24v-2a4 4 0 014-4h8a4 4 0 014 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="24" cy="12" r="3" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <path d="M22 24v-1a3 3 0 013-3h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Trust Circles",
    description: "Active participation in family, church, or community circles boosts credibility.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <circle cx="12" cy="13" r="2" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.1" />
        <circle cx="20" cy="13" r="2" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.1" />
        <circle cx="16" cy="19" r="2" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.1" />
        <path d="M12 15l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      </svg>
    ),
  },
  {
    title: "Dispute-Free History",
    description: "Maintaining clear, dispute-free transactions demonstrates reliability.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 4l11 7v7c0 6-4 11-11 15C9 29 5 24 5 18v-7l11-7z" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <path d="M11 17l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const creditLevels = [
  {
    name: "Bronze",
    color: "#CD7F32",
    description: "Starter trust",
    icon: "🥉",
  },
  {
    name: "Silver",
    color: "#C0C0C0",
    description: "Growing trust",
    icon: "🥈",
  },
  {
    name: "Gold",
    color: "#FFD700",
    description: "Strong trust",
    icon: "🥇",
  },
  {
    name: "Platinum",
    color: "#E5E4E2",
    description: "Max trust level",
    icon: "💎",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function TrustScoreSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });
  const shouldReduceMotion = useReducedMotion();

  const variants = shouldReduceMotion ? {} : itemVariants;
  const containerVars = shouldReduceMotion ? {} : containerVariants;

  return (
    <section
      ref={sectionRef}
      id="trust-score"
      aria-labelledby="trust-score-heading"
      className="landing-section relative overflow-hidden"
      style={{ background: "var(--landing-proof-bg)" }}
    >
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none landing-hero-mesh opacity-40" aria-hidden="true" />

      <div className="landing-container relative z-10">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVars}
        >
          <motion.div variants={variants} className="mb-4">
            <span className="landing-eyebrow">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 1l4 2v3c0 3-2 5-4 6-2-1-4-3-4-6V3l4-2z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Trust System
            </span>
          </motion.div>
          <motion.h2 id="trust-score-heading" className="landing-h2 mb-4" variants={variants}>
            Your Trust Score Grows With Every{" "}
            <span className="landing-accent-word">Positive Action</span>
          </motion.h2>
          <motion.p className="landing-body max-w-2xl mx-auto" variants={variants}>
            Me2U measures trust through six transparent signals. No hidden formulas—just clear actions that build your reputation and unlock better opportunities.
          </motion.p>
        </motion.div>

        {/* Signal Cards Grid */}
        <motion.div
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-12 md:mb-16"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVars}
        >
          {signals.map((signal) => (
            <motion.article
              key={signal.title}
              className="landing-card p-6 group"
              variants={variants}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 text-green group-hover:scale-110 transition-transform duration-300">
                  {signal.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base mb-1.5 text-[var(--color-text-primary)]">
                    {signal.title}
                  </h3>
                  <p className="text-sm landing-body">
                    {signal.description}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>

        {/* Credit Levels */}
        <motion.div
          className="text-center"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVars}
        >
          <motion.h3 className="landing-h3 mb-8" variants={variants}>
            Credit Levels
          </motion.h3>
          <motion.div
            className="flex flex-wrap justify-center gap-4 sm:gap-6"
            variants={containerVars}
          >
            {creditLevels.map((level, index) => (
              <motion.div
                key={level.name}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] min-w-[140px] hover:border-green/30 transition-colors"
                variants={variants}
              >
                <div className="text-4xl" aria-hidden="true">{level.icon}</div>
                <div className="font-semibold text-base" style={{ color: level.color }}>
                  {level.name}
                </div>
                <div className="text-xs text-[var(--color-muted-foreground)]">
                  {level.description}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
