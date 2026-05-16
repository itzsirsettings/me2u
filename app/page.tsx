"use client";

import { AuroraBackground } from "@/components/ui/aurora-background";
import { Button } from "@/components/ui/button";
import Icons8Icon, { type Icons8IconName } from "@/components/Icons8Icon";
import { motion } from "framer-motion";

const features: Array<{ icon: Icons8IconName; label: string; text: string }> = [
  { icon: "shield", label: "Protected onboarding", text: "₦1,000 registration deposit unlocks the first ₦2,000." },
  { icon: "tap", label: "Peer matching", text: "Borrowers and lenders meet in a shared marketplace." },
  { icon: "market", label: "Zero interest", text: "All platform and peer loans are interest-free." },
];

export default function Landing() {
  return (
    <AuroraBackground className="mobile-landing-shell h-[100svh] min-h-[100svh] items-stretch justify-start overflow-hidden bg-primary text-primary md:h-auto md:min-h-screen">
      <nav className="relative z-10 mx-auto flex w-full max-w-7xl shrink-0 items-center justify-between gap-4 p-3 pr-16 md:p-6">
        <h1 className="min-w-0 text-2xl font-display font-bold tracking-tight md:text-3xl">me2u</h1>
      </nav>

      <motion.section
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.15,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col justify-center px-4 py-4 text-center md:px-6 md:py-24"
      >
        <h2 className="mb-4 text-[2.35rem] font-display font-bold leading-[0.95] tracking-tight md:mb-6 md:text-7xl md:leading-tight">
          Peer-to-Peer Lending
          <br />
          Made Secure in Nigeria
        </h2>
        <p className="mx-auto mb-5 max-w-2xl text-sm leading-relaxed text-secondary md:mb-10 md:text-xl">
          Create your account • Meet matched peers • Interest-free loans
        </p>

        <div className="mx-auto flex w-full max-w-xs flex-col gap-3 sm:max-w-md sm:flex-row">
          <Button
            variant="secondary"
            className="min-h-12 w-full sm:flex-1"
            onClick={() => (window.location.href = "/login")}
          >
            Login
          </Button>
          <Button
            className="min-h-12 w-full sm:flex-1"
            onClick={() => (window.location.href = "/register")}
          >
            Register
          </Button>
        </div>

        <div className="mx-auto mt-6 grid w-full max-w-sm grid-cols-3 gap-2 text-center md:mt-16 md:max-w-5xl md:grid-cols-3 md:gap-4 md:text-left">
          {features.map((feature) => (
            <div
              key={feature.label}
              className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 shadow-[3px_3px_0px_var(--color-shadow)] backdrop-blur md:p-6 md:shadow-[4px_4px_0px_var(--color-shadow)]"
            >
              <Icons8Icon name={feature.icon} size={24} className="mx-auto mb-2 text-[var(--color-accent-primary)] md:mx-0 md:mb-4 md:size-7" />
              <p className="text-[11px] font-sans font-semibold leading-tight md:text-base md:leading-normal">{feature.label}</p>
              <p className="mt-2 hidden text-sm leading-relaxed text-secondary md:block">{feature.text}</p>
            </div>
          ))}
        </div>
      </motion.section>
    </AuroraBackground>
  );
}
