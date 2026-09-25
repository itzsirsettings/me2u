"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";

const circleTypes = [
  {
    emoji: "👨‍👩‍👧‍👦",
    name: "Family",
    useCase:
      "Pool savings for weddings, emergencies, or family projects with trusted relatives.",
    color: "#22C55E",
  },
  {
    emoji: "🎓",
    name: "School",
    useCase: "Students and alumni lend to each other for fees, books, and essentials.",
    color: "#3B82F6",
  },
  {
    emoji: "⛪",
    name: "Church / Mosque",
    useCase: "Faith communities support members with transparent, interest-free loans.",
    color: "#8B5CF6",
  },
  {
    emoji: "🏪",
    name: "Traders / Market",
    useCase: "Market traders share quick revolving loans between trusted stall members.",
    color: "#F59E0B",
  },
  {
    emoji: "💼",
    name: "Small Business",
    useCase: "Entrepreneurs pool capital and support each other's business growth.",
    color: "#EF4444",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function CommunityCirclesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const shouldReduceMotion = useReducedMotion();

  const variants = shouldReduceMotion ? {} : itemVariants;
  const containerVars = shouldReduceMotion ? {} : containerVariants;

  return (
    <section
      ref={sectionRef}
      id="community-circles"
      aria-labelledby="circles-heading"
      className="landing-section bg-gradient-to-b from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)]"
    >
      <div className="landing-container">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVars}
        >
          <motion.h2 id="circles-heading" className="landing-h2 mb-4" variants={variants}>
            Lend and Borrow Within Your{" "}
            <span className="landing-accent-word">Trusted Community</span>
          </motion.h2>
          <motion.p className="landing-body max-w-2xl mx-auto" variants={variants}>
            Create private circles with people you know and trust. Coordinate contributions,
            borrowing, and repayment within family, faith, trader, school, or business networks.
          </motion.p>
        </motion.div>

        {/* Circle Type Cards */}
        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-10 md:mb-12"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVars}
        >
          {circleTypes.map((circle) => (
            <motion.article
              key={circle.name}
              className="landing-card p-6 md:p-7 text-center group relative overflow-hidden"
              variants={variants}
            >
              {/* Background accent */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${circle.color}, transparent 70%)`,
                }}
                aria-hidden="true"
              />

              {/* Content */}
              <div className="relative z-10">
                <div
                  className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300"
                  aria-hidden="true"
                >
                  {circle.emoji}
                </div>
                <h3 className="landing-h3 mb-3 text-lg">{circle.name}</h3>
                <p className="text-sm landing-body">{circle.useCase}</p>
              </div>
            </motion.article>
          ))}

          {/* Fifth card spans full width on mobile, fits grid on larger screens */}
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Link
            href="https://app.me2ulend.online/circles"
            className="btn-secondary inline-flex items-center gap-2 min-h-[44px]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="14" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M2 17v-1.5a3 3 0 013-3h4a3 3 0 013 3V17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M13 17v-1a2.5 2.5 0 012.5-2.5H17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>Explore Circles</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
