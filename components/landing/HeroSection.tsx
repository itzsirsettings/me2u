"use client";

import { motion, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
            Borrow with clarity.
            <br />
            Build trust that opens doors.
            <br />
            <span className="hero-trust-word">
              Me2U.
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
            A Nigerian finance platform for verified people.
            <br className="hidden sm:inline" /> Use your wallet, repayments, circles, and
            referrals to build a stronger Trust Score.
            <br className="hidden sm:inline" /> Then borrow, lend, save, and manage everyday
            money with clearer terms.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div className="hero-cta-row" variants={fadeUp}>
            <Link
              href="https://app.me2ulend.online/register"
              className="hero-btn-primary"
              id="hero-open-account"
            >
              <span>Start Building Trust</span>
              <span className="hero-btn-shine" aria-hidden="true" />
            </Link>
            <a href="/#how-it-works" className="hero-btn-secondary" id="hero-learn-more">
              See the Me2U journey
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
