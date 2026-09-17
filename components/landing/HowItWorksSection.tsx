"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Join & Verify",
    description: "Sign up in minutes with a secure verified identity check. Your Trust Score journey begins here.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <path d="M24 14v10l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="14" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Build Trust & Save",
    description: "Use your wallet daily, complete on-time repayments, join circles, and refer trusted friends to grow your score.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 28l6 6 12-12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <path d="M24 8v8M24 32v8M8 24h8M32 24h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Borrow 0% / Lend & Earn",
    description: "Access interest-free loans based on your Trust Score, or lend to others and earn referral rewards.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <rect x="14" y="18" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
        <circle cx="24" cy="25" r="3" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.3" />
        <path d="M20 16v-2a4 4 0 018 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.18, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const shouldReduceMotion = useReducedMotion();

  const variants = shouldReduceMotion ? {} : itemVariants;
  const containerVars = shouldReduceMotion ? {} : containerVariants;

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="landing-section bg-gradient-to-b from-[var(--color-bg-primary)] to-[var(--color-bg-secondary)]"
    >
      <div className="landing-container">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVars}
        >
          <motion.div variants={variants} className="mb-4">
            <span className="landing-eyebrow">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="2" />
              </svg>
              Simple Process
            </span>
          </motion.div>
          <motion.h2 id="how-it-works-heading" className="landing-h2 mb-4" variants={variants}>
            How Me2U Works
          </motion.h2>
          <motion.p className="landing-body max-w-2xl mx-auto" variants={variants}>
            Start lending and borrowing with zero interest in three simple steps. Build trust, grow your network, and access fair finance.
          </motion.p>
        </motion.div>

        {/* Steps Grid */}
        <motion.div
          className="grid gap-6 md:grid-cols-3 md:gap-8 mb-10 md:mb-12"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVars}
        >
          {steps.map((step, index) => (
            <motion.article
              key={step.number}
              className="relative landing-card p-6 md:p-8 text-center group"
              variants={variants}
            >
              {/* Connector Arrow - Desktop only, not on last item */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <svg
                    width="32"
                    height="24"
                    viewBox="0 0 32 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-green"
                  >
                    <path
                      d="M0 12h28m0 0l-6-6m6 6l-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}

              {/* Step Number */}
              <div className="inline-flex items-center justify-center mb-4 text-5xl font-display font-bold text-green/20 group-hover:text-green/30 transition-colors">
                {step.number}
              </div>

              {/* Icon */}
              <div className="flex justify-center mb-5 text-green">
                {step.icon}
              </div>

              {/* Content */}
              <h3 className="landing-h3 mb-3">{step.title}</h3>
              <p className="landing-body text-sm">{step.description}</p>
            </motion.article>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <Link href="/register" className="btn-primary inline-flex items-center gap-2 min-h-[44px]">
            <span>Create Free Account</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 8h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
