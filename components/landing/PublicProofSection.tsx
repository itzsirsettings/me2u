"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { GlowCard } from "@/components/ui/spotlight-card";

const trustCommitments = [
  {
    number: "01",
    title: "Terms before action",
    detail:
      "Review eligibility, charges, retained balances, and repayment details before you confirm a transaction.",
  },
  {
    number: "02",
    title: "Verified identity",
    detail:
      "Identity and account checks help establish who is participating before sensitive features become available.",
  },
  {
    number: "03",
    title: "Recorded activity",
    detail:
      "Wallet movements, repayments, referrals, and account actions are recorded so your Trust Score has visible context.",
  },
];

const memberTestimonials = [
  {
    name: "Chinedu Okafor",
    location: "Lagos, Nigeria",
    quote:
      "Me2ULend makes the whole lending process feel simple and straightforward. I especially like how easy it is to navigate the platform and understand what is happening with my account. It feels like a solution built with everyday Nigerians in mind.",
  },
  {
    name: "Aisha Bello",
    location: "Abuja, Nigeria",
    quote:
      "What I like most about Me2ULend is the simplicity. I did not have to struggle to understand the platform, and the experience feels organized and convenient. It is refreshing to see a financial platform focused on making access easier.",
  },
  {
    name: "Daniel Eze",
    location: "Enugu, Nigeria",
    quote:
      "Using Me2ULend has been a smooth experience for me. The platform is easy to understand, and I like the idea of building trust through responsible financial activity. It gives users a reason to maintain a good financial record.",
  },
  {
    name: "Blessing Johnson",
    location: "Port Harcourt, Nigeria",
    quote:
      "Me2ULend feels different from many financial platforms I have tried. Everything is clearly presented, and the platform makes managing lending and financial activities much less stressful. I would recommend checking it out.",
  },
  {
    name: "Ibrahim Musa",
    location: "Kaduna, Nigeria",
    quote:
      "I like the community-focused approach behind Me2ULend. The platform combines technology with trust in a way that feels practical. The dashboard is simple to use, and important information is easy to find.",
  },
  {
    name: "Esther Adeyemi",
    location: "Ibadan, Nigeria",
    quote:
      "My experience with Me2ULend has been very convenient. Registration and navigating the platform were straightforward, and I like how the system encourages responsible financial behaviour. It feels modern and user-friendly.",
  },
  {
    name: "Samuel Nwankwo",
    location: "Owerri, Nigeria",
    quote:
      "Me2ULend is a promising platform for people looking for a simpler way to manage lending and related financial activities. I like the clean experience, the transparency of the process, and the focus on building trust between users.",
  },
];

export default function PublicProofSection() {
  return (
    <section
      className="relative overflow-hidden border-t border-[var(--color-border)] bg-[var(--landing-proof-bg)] py-24 text-foreground md:py-32"
      aria-labelledby="proof-heading"
    >
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[20%] left-[-10%] w-[800px] h-[800px] bg-green/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-green">
              Member experiences
            </p>
            <h2 id="proof-heading" className="text-3xl font-black leading-tight md:text-5xl">
              Trust should be visible before money moves.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-relaxed text-muted-foreground md:text-lg">
              Hear how Me2ULend members describe the platform, its simplicity, and its focus on
              building trust.
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3" role="list">
            {trustCommitments.map((commitment, index) => (
              <motion.div
                key={commitment.number}
                role="listitem"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <GlowCard
                  customSize
                  glowColor="green"
                  className="h-full rounded-2xl border border-[var(--color-border)] bg-[var(--landing-proof-card)] p-6 text-card-foreground shadow-[0_1rem_2rem_-1rem_rgba(8,19,32,0.05)]"
                >
                  <div className="mb-8 text-sm font-bold tabular-nums text-muted-foreground">
                    {commitment.number}
                  </div>
                  <h3 className="mb-3 text-xl font-black">{commitment.title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                    {commitment.detail}
                  </p>
                </GlowCard>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 rounded-3xl border border-[var(--color-border)] bg-[var(--landing-proof-card)]/60 p-6 md:p-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-green">Testimonials</p>
                <h3 className="mt-2 text-2xl font-black md:text-3xl">
                  What members are saying
                </h3>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" role="list">
              {memberTestimonials.map((testimonial) => (
                <article
                  key={testimonial.name}
                  role="listitem"
                  className="rounded-2xl border border-[var(--color-border)] bg-background/60 p-5"
                >
                  <blockquote className="text-base font-bold leading-relaxed text-card-foreground">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <footer className="mt-5 border-t border-[var(--color-border)] pt-4">
                    <p className="text-sm font-black text-[var(--landing-accent-strong)]">
                      {testimonial.name}
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      {testimonial.location}
                    </p>
                  </footer>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="h-full"
          >
            <GlowCard
              customSize
              glowColor="green"
              className="h-full rounded-3xl border border-[var(--color-border)] bg-[var(--landing-proof-card)] p-8 text-card-foreground shadow-[0_1rem_2rem_-1rem_rgba(8,19,32,0.05)] transition-colors duration-500 hover:bg-card md:p-12"
            >
              <h2 className="text-3xl md:text-4xl font-black mb-8 leading-tight">
                Trust built on <br />
                <span className="text-[var(--landing-accent-strong)]">transparency.</span>
              </h2>
            </GlowCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="h-full"
          >
            <GlowCard
              customSize
              glowColor="green"
              className="h-full rounded-3xl border border-[var(--color-border)] bg-[var(--landing-proof-card)] p-8 text-card-foreground shadow-[0_1rem_2rem_-1rem_rgba(8,19,32,0.05)] transition-colors duration-500 hover:bg-card md:p-12"
            >
              <h2 className="text-3xl md:text-4xl font-black mb-8 leading-tight">
                Use Me2U anywhere. <br />
                <span className="text-[var(--landing-accent-strong)]">
                  No app store needed.
                </span>
              </h2>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed mb-12">
                Me2U runs in any modern browser on your phone, tablet, or computer. Add it to
                your home screen in one tap for the full-app experience — nothing to download,
                nothing to wait for.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="btn-primary px-8 py-4 text-base shadow-xl shadow-green/10"
                >
                  Use Web Wallet
                </Link>
                <div className="px-6 py-4 bg-secondary border border-[var(--color-border)] text-muted-foreground rounded-2xl font-bold flex items-center gap-3">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <circle cx="9" cy="9" r="8" fill="var(--color-green)" opacity="0.15" />
                    <path
                      d="M5.5 9.5l2.5 2.5 4.5-5"
                      stroke="var(--color-green)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Works on any device
                </div>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
