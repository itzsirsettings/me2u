"use client";

import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import BlackHoleHeroSection from "@/components/ui/blackhole-hero-section";

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

function useNarrowViewport() {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return narrow;
}

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });
  const narrow = useNarrowViewport();

  return (
    <section
      ref={sectionRef}
      id="hero"
      aria-labelledby="landing-hero-heading"
      aria-describedby="landing-hero-description"
      className="hero-section"
    >
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <BlackHoleHeroSection
          className="bg-transparent bg-[url('/Hero_final.png')] bg-cover bg-center"
          focus={narrow ? [0.5, 0.76] : [0.72, 0.46]}
          scrim={narrow ? "top" : "left"}
          scrimStrength={0.9}
          distance={24}
          elevation={narrow ? -7 : -5.5}
          fov={narrow ? 58 : 42}
          glow={narrow ? 0.85 : 1}
          steps={narrow ? 190 : 260}
          resolution={narrow ? 0.52 : 0.62}
          maxDpr={narrow ? 1.25 : 1.5}
        />
      </div>
      <div className="hero-overlay" aria-hidden="true" />

      <div className="hero-content">
        <motion.div
          className="hero-text-block"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
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

          <motion.p id="landing-hero-description" className="hero-subtext" variants={fadeUp}>
            A Nigerian finance platform for verified people.
            <br className="hidden sm:inline" /> Use your wallet, repayments, circles, and
            referrals to build a stronger Trust Score.
            <br className="hidden sm:inline" /> Then borrow, lend, save, and manage everyday
            money with clearer terms.
          </motion.p>

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
