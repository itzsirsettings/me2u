"use client";

import { motion, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ─── Trust badge data with 6 badges as specified ─── */
const trustBadges = [
  {
    label: "No Interest",
    href: "/#how-it-works",
    icon: (
      <svg
        width="42"
        height="42"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="20" cy="20" r="15" stroke="var(--color-green)" strokeWidth="2" />
        <line
          x1="16"
          y1="24"
          x2="24"
          y2="16"
          stroke="var(--color-green)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="16.5" cy="16.5" r="1.5" fill="var(--color-green)" />
        <circle cx="23.5" cy="23.5" r="1.5" fill="var(--color-green)" />
      </svg>
    ),
  },
  {
    label: "No Hidden Fees",
    href: "/#comparison",
    icon: (
      <svg
        width="42"
        height="42"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="20" cy="20" r="15" stroke="var(--color-green)" strokeWidth="2" />
        <line
          x1="12"
          y1="12"
          x2="28"
          y2="28"
          stroke="var(--color-green)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect
          x="13"
          y="15"
          width="14"
          height="10"
          rx="1.5"
          stroke="var(--color-green)"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  {
    label: "P2P Verified",
    href: "/#trust-score",
    icon: (
      <svg
        width="42"
        height="42"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="20" cy="20" r="15" stroke="var(--color-green)" strokeWidth="2" />
        <path
          d="M13 25v-1a2 2 0 012-2h6a2 2 0 012 2v1M18 17a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"
          stroke="var(--color-green)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M22 22.5c.7-.2 1.3-.5 1.7-1a2 2 0 002-2v-.5"
          stroke="var(--color-green)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "Trust Scored",
    href: "/#trust-score",
    icon: (
      <svg
        width="42"
        height="42"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 8l6 3v5c0 4-2.4 7-6 9-3.6-2-6-5-6-9v-5l6-3z"
          stroke="var(--color-green)"
          strokeWidth="2"
          fill="var(--color-green)"
          opacity="0.1"
        />
        <path
          d="M16 20l2 2 4-4"
          stroke="var(--color-green)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="20"
          cy="20"
          r="15"
          stroke="var(--color-green)"
          strokeWidth="2"
          opacity="0.2"
        />
      </svg>
    ),
  },
  {
    label: "Diaspora Ready",
    href: "/#faq",
    icon: (
      <svg
        width="42"
        height="42"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="20" cy="20" r="15" stroke="var(--color-green)" strokeWidth="2" />
        <circle
          cx="20"
          cy="20"
          r="10"
          stroke="var(--color-green)"
          strokeWidth="2"
          opacity="0.3"
        />
        <path d="M20 5v30M5 20h30" stroke="var(--color-green)" strokeWidth="2" opacity="0.3" />
        <path
          d="M12 12a10 10 0 0016 0M12 28a10 10 0 0016 0"
          stroke="var(--color-green)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "Nigeria Built",
    href: "/#features",
    icon: (
      <svg
        width="42"
        height="42"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="20" cy="20" r="15" stroke="var(--color-green)" strokeWidth="2" />
        <path d="M20 12l-4 6h8z" fill="var(--color-green)" opacity="0.3" />
        <path
          d="M14 20h12v8H14z"
          fill="var(--color-green)"
          opacity="0.2"
          stroke="var(--color-green)"
          strokeWidth="2"
        />
        <circle cx="20" cy="16" r="2" fill="var(--color-green)" />
      </svg>
    ),
  },
];

/* ─── Stagger animation variants ─── */
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  /* Subtle parallax on desktop */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 768) return;
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const parallaxX = (mousePos.x - 0.5) * -12;
  const parallaxY = (mousePos.y - 0.5) * -8;

  return (
    <section
      ref={sectionRef}
      id="hero"
      aria-labelledby="landing-hero-heading"
      aria-describedby="landing-hero-description"
      className="hero-section"
    >
      {/* ── Background Image ── */}
      <div
        className="hero-bg"
        style={{
          transform: `translate(${parallaxX}px, ${parallaxY}px) scale(1.04)`,
        }}
      >
        <Image
          src="/Hero_final.png"
          alt="Young woman using Me2U app on her smartphone"
          fill
          priority
          sizes="100vw"
          className="hero-bg-img"
        />
        {/* Dark gradient overlay for text readability */}
        <div className="hero-overlay" />
      </div>

      {/* ── Content ── */}
      <div className="hero-content">
        <motion.div
          className="hero-text-block"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {/* Headline */}
          <motion.h1 id="landing-hero-heading" className="hero-headline" variants={fadeUp}>
            0% Interest Loans.
            <br />
            Built on{" "}
            <span className="hero-trust-word">
              Trust.
              <svg
                className="hero-trust-underline"
                viewBox="0 0 200 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                <motion.path
                  d="M2 8C40 3 100 2 198 8"
                  stroke="var(--color-green)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
                  transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                />
              </svg>
            </span>
          </motion.h1>

          {/* Sub-copy */}
          <motion.p id="landing-hero-description" className="hero-subtext" variants={fadeUp}>
            For Every Nigerian.
            <br className="hidden sm:inline" /> Send, borrow, and repay with people you trust—no
            interest, no hidden fees.
            <br className="hidden sm:inline" /> Fair peer-to-peer finance built for Nigeria and
            the Diaspora.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div className="hero-cta-row" variants={fadeUp}>
            <Link href="/register" className="hero-btn-primary" id="hero-open-account">
              <span>Create Free Account</span>
              <span className="hero-btn-shine" aria-hidden="true" />
            </Link>
            <a href="/#how-it-works" className="hero-btn-secondary" id="hero-learn-more">
              See How It Works
            </a>
          </motion.div>

          {/* Trust Badges */}
          <motion.div className="hero-trust-row" variants={fadeUp}>
            {trustBadges.map((badge, i) => (
              <motion.div key={badge.label} variants={scaleIn}>
                <Link href={badge.href} className="hero-trust-badge" id={`hero-trust-${i}`}>
                  <span className="hero-trust-icon" aria-hidden="true">
                    {badge.icon}
                  </span>
                  <span className="hero-trust-label">{badge.label}</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
