"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUp, LogIn, UserPlus } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STYLES = `
.cinematic-footer-wrapper {
  -webkit-font-smoothing: antialiased;

  --footer-bg: var(--navy);
  --footer-fg: var(--snow);
  --footer-muted: color-mix(in srgb, var(--snow) 62%, transparent);
  --footer-soft: color-mix(in srgb, var(--snow) 12%, transparent);
  --footer-border: color-mix(in srgb, var(--snow) 12%, transparent);
  --footer-primary: var(--green);
  --footer-secondary: var(--lime);

  --pill-bg-1: color-mix(in srgb, var(--snow) 10%, transparent);
  --pill-bg-2: color-mix(in srgb, var(--snow) 4%, transparent);
  --pill-shadow: rgba(0, 0, 0, 0.42);
  --pill-highlight: color-mix(in srgb, var(--snow) 22%, transparent);
  --pill-inset-shadow: rgba(0, 0, 0, 0.32);
  --pill-border: color-mix(in srgb, var(--green) 24%, transparent);

  --pill-bg-1-hover: color-mix(in srgb, var(--green) 26%, transparent);
  --pill-bg-2-hover: color-mix(in srgb, var(--lime) 14%, transparent);
  --pill-border-hover: color-mix(in srgb, var(--lime) 45%, transparent);
  --pill-shadow-hover: rgba(0, 0, 0, 0.5);
  --pill-highlight-hover: color-mix(in srgb, var(--lime) 28%, transparent);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.55; }
  100% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.95; }
}

@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.animate-footer-breathe {
  animation: footer-breathe 8s ease-in-out infinite alternate;
}

.animate-footer-scroll-marquee {
  animation: footer-scroll-marquee 40s linear infinite;
}

.footer-bg-grid {
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, color-mix(in srgb, var(--snow) 6%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, var(--snow) 6%, transparent) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 72%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 72%, transparent);
}

.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in srgb, var(--green) 28%, transparent) 0%,
    color-mix(in srgb, var(--lime) 18%, transparent) 38%,
    transparent 72%
  );
}

.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow:
    0 10px 30px -10px var(--pill-shadow),
    inset 0 1px 1px var(--pill-highlight),
    inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow:
    0 20px 40px -10px var(--pill-shadow-hover),
    inset 0 1px 1px var(--pill-highlight-hover);
  color: var(--footer-fg);
}

.footer-giant-bg-text {
  font-size: clamp(9rem, 26vw, 28rem);
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.08em;
  color: transparent;
  -webkit-text-stroke: 1px color-mix(in srgb, var(--green) 16%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--lime) 16%, transparent) 0%, transparent 62%);
  -webkit-background-clip: text;
  background-clip: text;
}

.footer-text-glow {
  background: linear-gradient(180deg, var(--snow) 0%, color-mix(in srgb, var(--green) 50%, var(--snow)) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 20px color-mix(in srgb, var(--green) 22%, transparent));
}
`;

type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    as?: React.ElementType;
  };

const MagneticButton = React.forwardRef<HTMLElement, MagneticButtonProps>(
  ({ className, children, as: Component = "button", ...props }, forwardedRef) => {
    const localRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const element = localRef.current;
      if (!element) return;

      const ctx = gsap.context(() => {
        const handleMouseMove = (event: MouseEvent) => {
          const rect = element.getBoundingClientRect();
          const x = event.clientX - rect.left - rect.width / 2;
          const y = event.clientY - rect.top - rect.height / 2;

          gsap.to(element, {
            x: x * 0.28,
            y: y * 0.28,
            rotationX: -y * 0.12,
            rotationY: x * 0.12,
            scale: 1.04,
            ease: "power2.out",
            duration: 0.35,
          });
        };

        const handleMouseLeave = () => {
          gsap.to(element, {
            x: 0,
            y: 0,
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            ease: "elastic.out(1, 0.3)",
            duration: 1.1,
          });
        };

        element.addEventListener("mousemove", handleMouseMove);
        element.addEventListener("mouseleave", handleMouseLeave);

        return () => {
          element.removeEventListener("mousemove", handleMouseMove);
          element.removeEventListener("mouseleave", handleMouseLeave);
        };
      }, element);

      return () => ctx.revert();
    }, []);

    return (
      <Component
        ref={(node: HTMLElement | null) => {
          localRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        className={cn("cursor-pointer", className)}
        {...props}
      >
        {children}
      </Component>
    );
  },
);
MagneticButton.displayName = "MagneticButton";

const MarqueeItem = () => (
  <div className="flex items-center gap-12 px-6">
    <span>0% peer lending</span> <span className="text-green/70">✦</span>
    <span>Verified wallets</span> <span className="text-lime/70">✦</span>
    <span>Trust scores</span> <span className="text-green/70">✦</span>
    <span>Me2U Circles</span> <span className="text-lime/70">✦</span>
    <span>Transparent repayments</span> <span className="text-green/70">✦</span>
  </div>
);

export function CinematicFooter() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!wrapperRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        giantTextRef.current,
        { y: "10vh", scale: 0.8, opacity: 0 },
        {
          y: "0vh",
          scale: 1,
          opacity: 1,
          ease: "power1.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 80%",
            end: "bottom bottom",
            scrub: 1,
          },
        },
      );

      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 42%",
            end: "bottom bottom",
            scrub: 1,
          },
        },
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div
        ref={wrapperRef}
        className="relative h-screen w-full"
        style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
      >
        <footer className="cinematic-footer-wrapper fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden bg-navy text-snow">
          <div className="footer-aurora pointer-events-none absolute left-1/2 top-1/2 z-0 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[80px]" />
          <div className="footer-bg-grid pointer-events-none absolute inset-0 z-0" />

          <div
            ref={giantTextRef}
            className="footer-giant-bg-text pointer-events-none absolute -bottom-[5vh] left-1/2 z-0 -translate-x-1/2 select-none whitespace-nowrap"
          >
            me2u
          </div>

          <div className="relative z-10 mx-auto mt-20 flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6">
            <div className="mb-[2px] w-screen scale-110 -rotate-2 overflow-hidden border-y border-snow/10 bg-navy/70 py-4 shadow-2xl backdrop-blur-md">
              <div className="flex w-max animate-footer-scroll-marquee text-xs font-bold uppercase tracking-[0.3em] text-snow/62 md:text-sm">
                <MarqueeItem />
                <MarqueeItem />
              </div>
            </div>

            <h2
              ref={headingRef}
              className="footer-text-glow mb-12 text-center text-5xl font-black tracking-tighter md:text-8xl"
            >
              Ready to begin?
            </h2>

            <div ref={linksRef} className="flex w-full flex-col items-center gap-6">
              <div className="flex w-full flex-wrap justify-center gap-4">
                <MagneticButton
                  as={Link}
                  href="/register"
                  className="footer-glass-pill group flex items-center gap-3 rounded-full px-10 py-5 text-sm font-bold text-snow md:text-base"
                >
                  <UserPlus className="h-5 w-5 text-green transition-colors group-hover:text-lime" />
                  Open account
                </MagneticButton>

                <MagneticButton
                  as={Link}
                  href="/login"
                  className="footer-glass-pill group flex items-center gap-3 rounded-full px-10 py-5 text-sm font-bold text-snow md:text-base"
                >
                  <LogIn className="h-5 w-5 text-green transition-colors group-hover:text-lime" />
                  Log in
                </MagneticButton>
              </div>

              <div className="mt-2 flex w-full flex-wrap justify-center gap-3 md:gap-6">
                <MagneticButton
                  as={Link}
                  href="/legal/privacy-policy"
                  className="footer-glass-pill rounded-full px-6 py-3 text-xs font-medium text-snow/70 hover:text-snow md:text-sm"
                >
                  Privacy Policy
                </MagneticButton>
                <MagneticButton
                  as={Link}
                  href="/legal/terms-of-use"
                  className="footer-glass-pill rounded-full px-6 py-3 text-xs font-medium text-snow/70 hover:text-snow md:text-sm"
                >
                  Terms of Use
                </MagneticButton>
                <MagneticButton
                  as={Link}
                  href="/security"
                  className="footer-glass-pill rounded-full px-6 py-3 text-xs font-medium text-snow/70 hover:text-snow md:text-sm"
                >
                  Security
                </MagneticButton>
                <MagneticButton
                  as={Link}
                  href="/support"
                  className="footer-glass-pill rounded-full px-6 py-3 text-xs font-medium text-snow/70 hover:text-snow md:text-sm"
                >
                  Support
                </MagneticButton>
              </div>
            </div>
          </div>

          <div className="relative z-20 flex w-full flex-col items-center justify-between gap-6 px-6 pb-8 md:flex-row md:px-12">
            <div className="order-2 text-[10px] font-semibold uppercase tracking-widest text-snow/52 md:order-1 md:text-xs">
              © 2026 Me2U. All rights reserved.
            </div>

            <MagneticButton
              as="button"
              type="button"
              onClick={scrollToTop}
              aria-label="Back to top"
              className="footer-glass-pill order-3 flex h-12 w-12 items-center justify-center rounded-full text-snow/70 hover:text-snow"
            >
              <ArrowUp className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-1.5" />
            </MagneticButton>
          </div>
        </footer>
      </div>
    </>
  );
}
