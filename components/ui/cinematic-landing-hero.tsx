"use client";

import React, { useEffect, useRef } from "react";
import { Check, CircleCheck, Flame, Handshake } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const INJECTED_STYLES = `
  .gsap-reveal { visibility: hidden; }
  .transform-style-3d { transform-style: preserve-3d; }

  /* Environment Overlays */
  .film-grain {
      position: absolute; inset: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 50; opacity: 0.05; mix-blend-mode: overlay;
      background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
  }

  .bg-grid-theme {
      background-size: 60px 60px;
      background-image:
          linear-gradient(to right, color-mix(in srgb, var(--color-foreground) 5%, transparent) 1px, transparent 1px),
          linear-gradient(to bottom, color-mix(in srgb, var(--color-foreground) 5%, transparent) 1px, transparent 1px);
      mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }

  /* Physical skeuomorphic materials */
  .text-3d-matte {
      color: var(--color-foreground);
      text-shadow:
          0 10px 30px color-mix(in srgb, var(--color-foreground) 20%, transparent),
          0 2px 4px color-mix(in srgb, var(--color-foreground) 10%, transparent);
  }

  .text-silver-matte {
      background: linear-gradient(180deg, var(--color-foreground) 0%, color-mix(in srgb, var(--color-foreground) 40%, transparent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      transform: translateZ(0);
      filter:
          drop-shadow(0px 10px 20px color-mix(in srgb, var(--color-foreground) 15%, transparent))
          drop-shadow(0px 2px 4px color-mix(in srgb, var(--color-foreground) 10%, transparent));
  }

  .text-card-silver-matte {
      background: linear-gradient(180deg, var(--color-light) 0%, var(--color-lime) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      transform: translateZ(0);
      filter:
          drop-shadow(0px 12px 24px rgba(0,0,0,0.8))
          drop-shadow(0px 4px 8px rgba(0,0,0,0.6));
  }

  .premium-depth-card {
      background: linear-gradient(145deg, var(--color-slate) 0%, var(--color-dark) 100%);
      box-shadow:
          0 40px 100px -20px rgba(0, 0, 0, 0.9),
          0 20px 40px -20px rgba(0, 0, 0, 0.8),
          inset 0 1px 2px rgba(255, 255, 255, 0.2),
          inset 0 -2px 4px rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.04);
      position: relative;
  }

  .card-sheen {
      position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
      background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06) 0%, transparent 40%);
      mix-blend-mode: screen; transition: opacity 0.3s ease;
  }

  .iphone-bezel {
      background-color: var(--color-dark);
      box-shadow:
          inset 0 0 0 2px color-mix(in srgb, var(--color-slate) 70%, var(--color-light)),
          inset 0 0 0 7px var(--color-dark),
          0 40px 80px -15px rgba(0,0,0,0.9),
          0 15px 25px -5px rgba(0,0,0,0.7);
      transform-style: preserve-3d;
  }

  .hardware-btn {
      background: linear-gradient(90deg, var(--color-slate) 0%, var(--color-dark) 100%);
      box-shadow:
          -2px 0 5px rgba(0,0,0,0.8),
          inset -1px 0 1px rgba(255,255,255,0.15),
          inset 1px 0 2px rgba(0,0,0,0.8);
      border-left: 1px solid rgba(255,255,255,0.05);
  }

  .screen-glare {
      background: linear-gradient(110deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 45%);
  }

  .widget-depth {
      background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
      box-shadow:
          0 10px 20px rgba(0,0,0,0.3),
          inset 0 1px 1px rgba(255,255,255,0.05),
          inset 0 -1px 1px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.03);
  }

  .floating-ui-badge {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.01) 100%);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      box-shadow:
          0 0 0 1px rgba(255, 255, 255, 0.1),
          0 25px 50px -12px rgba(0, 0, 0, 0.8),
          inset 0 1px 1px rgba(255,255,255,0.2),
          inset 0 -1px 1px rgba(0,0,0,0.5);
  }

  .btn-modern-light, .btn-modern-dark {
      transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  }
  .btn-modern-light {
      background: linear-gradient(180deg, var(--color-light) 0%, color-mix(in srgb, var(--color-light) 88%, var(--color-lime)) 100%);
      color: var(--color-dark);
      box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1), 0 12px 24px -4px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,1), inset 0 -3px 6px rgba(0,0,0,0.06);
  }
  .btn-modern-light:hover {
      transform: translateY(-3px);
      box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 6px 12px -2px rgba(0,0,0,0.15), 0 20px 32px -6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,1), inset 0 -3px 6px rgba(0,0,0,0.06);
  }
  .btn-modern-light:active {
      transform: translateY(1px);
      background: linear-gradient(180deg, color-mix(in srgb, var(--color-light) 88%, var(--color-lime)) 0%, color-mix(in srgb, var(--color-light) 78%, var(--color-slate)) 100%);
      box-shadow: 0 0 0 1px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.1), inset 0 3px 6px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(0,0,0,0.02);
  }
  .btn-modern-dark {
      background: linear-gradient(180deg, var(--color-slate) 0%, var(--color-dark) 100%);
      color: var(--color-light);
      box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.6), 0 12px 24px -4px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -3px 6px rgba(0,0,0,0.8);
  }
  .btn-modern-dark:hover {
      transform: translateY(-3px);
      background: linear-gradient(180deg, color-mix(in srgb, var(--color-slate) 86%, var(--color-light)) 0%, var(--color-slate) 100%);
      box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 6px 12px -2px rgba(0,0,0,0.7), 0 20px 32px -6px rgba(0,0,0,1), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -3px 6px rgba(0,0,0,0.8);
  }
  .btn-modern-dark:active {
      transform: translateY(1px);
      background: var(--color-dark);
      box-shadow: 0 0 0 1px rgba(255,255,255,0.05), inset 0 3px 8px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(0,0,0,0.5);
  }

  .progress-ring {
      transform: rotate(-90deg);
      transform-origin: center;
      stroke-dasharray: 402;
      stroke-dashoffset: 402;
      stroke-linecap: round;
  }
`;

export interface CinematicHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  brandName?: string;
  eyebrow?: string;
  tagline1?: string;
  tagline2?: string;
  cardHeading?: string;
  cardDescription?: React.ReactNode;
  metricValue?: number;
  metricLabel?: string;
  ctaHeading?: string;
  ctaDescription?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
}

export function CinematicHero({
  brandName = "Me2U",
  eyebrow = "CBN licensed - NDIC insured",
  tagline1 = "Zero-interest lending,",
  tagline2 = "powered by trust.",
  cardHeading = "Trust-based finance, redefined.",
  cardDescription = (
    <>
      <span className="font-semibold text-snow">Me2U</span> helps verified peers send,
      borrow, and repay with 0% interest, transparent wallets, KYC-backed trust scores,
      and cooperative-friendly repayment flows.
    </>
  ),
  metricValue = 80,
  metricLabel = "Trust Score",
  ctaHeading = "Open your Me2U account.",
  ctaDescription = "Join a fair P2P finance network built for Nigeria, with no hidden fees and no interest.",
  primaryCtaLabel = "Open account",
  primaryCtaHref = "/register",
  secondaryCtaLabel = "Learn more",
  secondaryCtaHref = "/learn",
  className,
  style,
  ...props
}: CinematicHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.scrollY > window.innerHeight * 2) return;

      cancelAnimationFrame(requestRef.current);

      requestRef.current = requestAnimationFrame(() => {
        if (mainCardRef.current && mockupRef.current) {
          const rect = mainCardRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          mainCardRef.current.style.setProperty("--mouse-x", `${mouseX}px`);
          mainCardRef.current.style.setProperty("--mouse-y", `${mouseY}px`);

          const xVal = (e.clientX / window.innerWidth - 0.5) * 2;
          const yVal = (e.clientY / window.innerHeight - 0.5) * 2;

          gsap.to(mockupRef.current, {
            rotationY: xVal * 12,
            rotationX: -yVal * 12,
            ease: "power3.out",
            duration: 1.2,
          });
        }
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      gsap.set(".hero-eyebrow", { autoAlpha: 0, y: 24, filter: "blur(12px)" });
      gsap.set(".text-track", {
        autoAlpha: 0,
        y: 60,
        scale: 0.85,
        filter: "blur(20px)",
        rotationX: -20,
      });
      gsap.set(".text-days", { autoAlpha: 1, clipPath: "inset(0 100% 0 0)" });
      gsap.set(".main-card", { y: window.innerHeight + 200, autoAlpha: 1 });
      gsap.set(
        [
          ".card-left-text",
          ".card-right-text",
          ".mockup-scroll-wrapper",
          ".floating-badge",
          ".phone-widget",
        ],
        { autoAlpha: 0 },
      );
      gsap.set(".cta-wrapper", { autoAlpha: 0, scale: 0.8, filter: "blur(30px)" });

      const introTl = gsap.timeline({ delay: 0.3 });
      introTl
        .to(".hero-eyebrow", {
          duration: 1.1,
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          ease: "expo.out",
        })
        .to(
          ".text-track",
          {
            duration: 1.8,
            autoAlpha: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            rotationX: 0,
            ease: "expo.out",
          },
          "-=0.7",
        )
        .to(
          ".text-days",
          { duration: 1.4, clipPath: "inset(0 0% 0 0)", ease: "power4.inOut" },
          "-=1.0",
        );

      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=7000",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      scrollTl
        .to(
          [".hero-text-wrapper", ".bg-grid-theme"],
          {
            scale: 1.15,
            filter: "blur(20px)",
            opacity: 0.2,
            ease: "power2.inOut",
            duration: 2,
          },
          0,
        )
        .to(".main-card", { y: 0, ease: "power3.inOut", duration: 2 }, 0)
        .to(".main-card", {
          width: "100%",
          height: "100%",
          borderRadius: "0px",
          ease: "power3.inOut",
          duration: 1.5,
        })
        .fromTo(
          ".mockup-scroll-wrapper",
          { y: 300, z: -500, rotationX: 50, rotationY: -30, autoAlpha: 0, scale: 0.6 },
          {
            y: 0,
            z: 0,
            rotationX: 0,
            rotationY: 0,
            autoAlpha: 1,
            scale: 1,
            ease: "expo.out",
            duration: 2.5,
          },
          "-=0.8",
        )
        .fromTo(
          ".phone-widget",
          { y: 40, autoAlpha: 0, scale: 0.95 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            stagger: 0.15,
            ease: "back.out(1.2)",
            duration: 1.5,
          },
          "-=1.5",
        )
        .to(".progress-ring", { strokeDashoffset: 60, duration: 2, ease: "power3.inOut" }, "-=1.2")
        .to(
          ".counter-val",
          { innerHTML: metricValue, snap: { innerHTML: 1 }, duration: 2, ease: "expo.out" },
          "-=2.0",
        )
        .fromTo(
          ".floating-badge",
          { y: 100, autoAlpha: 0, scale: 0.7, rotationZ: -10 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            rotationZ: 0,
            ease: "back.out(1.5)",
            duration: 1.5,
            stagger: 0.2,
          },
          "-=2.0",
        )
        .fromTo(
          ".card-left-text",
          { x: -50, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, ease: "power4.out", duration: 1.5 },
          "-=1.5",
        )
        .fromTo(
          ".card-right-text",
          { x: 50, autoAlpha: 0, scale: 0.8 },
          { x: 0, autoAlpha: 1, scale: 1, ease: "expo.out", duration: 1.5 },
          "<",
        )
        .to({}, { duration: 2.5 })
        .set(".hero-text-wrapper", { autoAlpha: 0 })
        .set(".cta-wrapper", { autoAlpha: 1 })
        .to({}, { duration: 1.5 })
        .to([".mockup-scroll-wrapper", ".floating-badge", ".card-left-text", ".card-right-text"], {
          scale: 0.9,
          y: -40,
          z: -200,
          autoAlpha: 0,
          ease: "power3.in",
          duration: 1.2,
          stagger: 0.05,
        })
        .to(
          ".main-card",
          {
            width: isMobile ? "92vw" : "85vw",
            height: isMobile ? "92vh" : "85vh",
            borderRadius: isMobile ? "32px" : "40px",
            ease: "expo.inOut",
            duration: 1.8,
          },
          "pullback",
        )
        .to(".cta-wrapper", { scale: 1, filter: "blur(0px)", ease: "expo.inOut", duration: 1.8 }, "pullback")
        .to(".main-card", { y: -window.innerHeight - 300, ease: "power3.in", duration: 1.5 });
    }, containerRef);

    return () => ctx.revert();
  }, [metricValue]);

  const heroStyle = {
    "--color-foreground": "var(--color-text-primary)",
    "--color-muted-foreground": "var(--color-text-secondary)",
    "--color-background": "var(--color-page-background)",
    perspective: "1500px",
    ...style,
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative isolate flex h-screen w-screen items-center justify-center overflow-hidden bg-background text-foreground antialiased",
        className,
      )}
      style={heroStyle}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="film-grain" aria-hidden="true" />
      <div className="bg-grid-theme pointer-events-none absolute inset-0 z-0 opacity-50" aria-hidden="true" />

      <div className="hero-text-wrapper transform-style-3d absolute z-10 flex w-screen flex-col items-center justify-center px-4 text-center will-change-transform">
        <p className="hero-eyebrow gsap-reveal mb-5 rounded-full border border-green/20 bg-green/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-green shadow-[0_12px_30px_rgba(34,197,94,0.12)]">
          {eyebrow}
        </p>
        <h1 className="text-track gsap-reveal text-3d-matte mb-2 text-5xl font-bold tracking-tight md:text-7xl lg:text-[6rem]">
          {tagline1}
        </h1>
        <h1 className="text-days gsap-reveal text-silver-matte text-5xl font-extrabold tracking-tighter md:text-7xl lg:text-[6rem]">
          {tagline2}
        </h1>
      </div>

      <div className="cta-wrapper gsap-reveal pointer-events-auto absolute z-10 flex w-screen flex-col items-center justify-center px-4 text-center will-change-transform">
        <h2 className="text-silver-matte mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
          {ctaHeading}
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-lg font-light leading-relaxed text-muted-foreground md:text-xl">
          {ctaDescription}
        </p>
        <div className="flex flex-col gap-6 sm:flex-row">
          <a
            href={primaryCtaHref}
            className="btn-modern-light group flex items-center justify-center gap-3 rounded-[1.25rem] px-8 py-4 focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2"
          >
            <CircleCheck className="size-7 transition-transform group-hover:scale-105" aria-hidden="true" />
            <span className="text-xl font-bold leading-none tracking-tight">{primaryCtaLabel}</span>
          </a>
          <a
            href={secondaryCtaHref}
            className="btn-modern-dark group flex items-center justify-center gap-3 rounded-[1.25rem] px-8 py-4 focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-2 focus:ring-offset-background"
          >
            <span className="grid size-7 place-items-center rounded-full border border-snow/15 text-sm font-black transition-transform group-hover:scale-105">
              i
            </span>
            <span className="text-xl font-bold leading-none tracking-tight">{secondaryCtaLabel}</span>
          </a>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" style={{ perspective: "1500px" }}>
        <div
          ref={mainCardRef}
          className="main-card premium-depth-card gsap-reveal pointer-events-auto relative flex h-[92vh] w-[92vw] items-center justify-center overflow-hidden rounded-[32px] md:h-[85vh] md:w-[85vw] md:rounded-[40px]"
        >
          <div className="card-sheen" aria-hidden="true" />

          <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col items-center justify-evenly px-4 py-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:px-12 lg:py-0">
            <div className="card-right-text gsap-reveal order-1 z-20 flex w-full justify-center lg:order-3 lg:justify-end">
              <h2 className="text-card-silver-matte text-6xl font-black uppercase tracking-tighter md:text-[6rem] lg:mt-0 lg:text-[8rem]">
                {brandName}
              </h2>
            </div>

            <div className="mockup-scroll-wrapper order-2 relative z-10 flex h-[380px] w-full items-center justify-center lg:order-2 lg:h-[600px]" style={{ perspective: "1000px" }}>
              <div className="relative flex h-full w-full scale-[0.65] items-center justify-center md:scale-[0.85] lg:scale-100">
                <div
                  ref={mockupRef}
                  className="iphone-bezel transform-style-3d relative flex h-[580px] w-[280px] flex-col rounded-[3rem] will-change-transform"
                >
                  <div className="hardware-btn absolute -left-[3px] top-[120px] z-0 h-[25px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="hardware-btn absolute -left-[3px] top-[160px] z-0 h-[45px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="hardware-btn absolute -left-[3px] top-[220px] z-0 h-[45px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="hardware-btn absolute -right-[3px] top-[170px] z-0 h-[70px] w-[3px] scale-x-[-1] rounded-r-md" aria-hidden="true" />

                  <div className="absolute inset-[7px] z-10 overflow-hidden rounded-[2.5rem] bg-navy text-snow shadow-[inset_0_0_15px_rgba(8,19,32,1)]">
                    <div className="screen-glare pointer-events-none absolute inset-0 z-40" aria-hidden="true" />

                    <div className="absolute left-1/2 top-[5px] z-50 flex h-[28px] w-[100px] -translate-x-1/2 items-center justify-end rounded-full bg-navy px-3 shadow-[inset_0_-1px_2px_rgba(248,250,252,0.1)]">
                      <div className="size-1.5 animate-pulse rounded-full bg-green shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                    </div>

                    <div className="relative flex h-full w-full flex-col px-5 pb-8 pt-12">
                      <div className="phone-widget mb-8 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-snow/45">Today</span>
                          <span className="text-xl font-bold tracking-tight text-snow drop-shadow-md">Trust</span>
                        </div>
                        <div className="flex size-9 items-center justify-center rounded-full border border-snow/10 bg-snow/5 text-sm font-bold text-snow/80 shadow-lg shadow-navy/50">
                          M2
                        </div>
                      </div>

                      <div className="phone-widget relative mx-auto mb-8 flex size-44 items-center justify-center drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]">
                        <svg className="absolute inset-0 size-full" aria-hidden="true">
                          <circle cx="88" cy="88" r="64" fill="none" stroke="rgba(248,250,252,0.03)" strokeWidth="12" />
                          <circle className="progress-ring" cx="88" cy="88" r="64" fill="none" stroke="var(--color-green)" strokeWidth="12" />
                        </svg>
                        <div className="z-10 flex flex-col items-center text-center">
                          <span className="counter-val text-4xl font-extrabold tracking-tighter text-snow">0</span>
                          <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-lime/55">{metricLabel}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="phone-widget widget-depth flex items-center rounded-2xl p-3">
                          <div className="mr-3 flex size-10 items-center justify-center rounded-xl border border-green/20 bg-gradient-to-br from-green/20 to-green/5 shadow-inner">
                            <CircleCheck className="size-4 text-green drop-shadow-md" aria-hidden="true" />
                          </div>
                          <div className="flex-1">
                            <div className="mb-2 h-2 w-20 rounded-full bg-snow/75 shadow-inner" />
                            <div className="h-1.5 w-12 rounded-full bg-slate-light shadow-inner" />
                          </div>
                        </div>
                        <div className="phone-widget widget-depth flex items-center rounded-2xl p-3">
                          <div className="mr-3 flex size-10 items-center justify-center rounded-xl border border-lime/20 bg-gradient-to-br from-lime/20 to-lime/5 shadow-inner">
                            <Check className="size-4 text-lime drop-shadow-md" aria-hidden="true" />
                          </div>
                          <div className="flex-1">
                            <div className="mb-2 h-2 w-16 rounded-full bg-snow/75 shadow-inner" />
                            <div className="h-1.5 w-24 rounded-full bg-slate-light shadow-inner" />
                          </div>
                        </div>
                      </div>

                      <div className="absolute bottom-2 left-1/2 h-[4px] w-[120px] -translate-x-1/2 rounded-full bg-snow/20 shadow-[0_1px_2px_rgba(8,19,32,0.5)]" />
                    </div>
                  </div>
                </div>

                <div className="floating-badge floating-ui-badge absolute left-[-15px] top-6 z-30 flex items-center gap-3 rounded-xl p-3 lg:left-[-80px] lg:top-12 lg:gap-4 lg:rounded-2xl lg:p-4">
                  <div className="flex size-8 items-center justify-center rounded-full border border-green/30 bg-gradient-to-b from-green/20 to-navy/10 shadow-inner lg:size-10">
                    <Flame className="size-4 text-green drop-shadow-lg lg:size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-tight text-snow lg:text-sm">80 trust score</p>
                    <p className="text-[10px] font-medium text-lime/55 lg:text-xs">Gold level unlocked</p>
                  </div>
                </div>

                <div className="floating-badge floating-ui-badge absolute bottom-12 right-[-15px] z-30 flex items-center gap-3 rounded-xl p-3 lg:bottom-20 lg:right-[-80px] lg:gap-4 lg:rounded-2xl lg:p-4">
                  <div className="flex size-8 items-center justify-center rounded-full border border-lime/30 bg-gradient-to-b from-lime/20 to-navy/10 shadow-inner lg:size-10">
                    <Handshake className="size-4 text-lime drop-shadow-lg lg:size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-tight text-snow lg:text-sm">Peer verified</p>
                    <p className="text-[10px] font-medium text-lime/55 lg:text-xs">Loan ready</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-left-text gsap-reveal order-3 z-20 flex w-full flex-col justify-center px-4 text-center lg:order-1 lg:max-w-none lg:px-0 lg:text-left">
              <h3 className="mb-0 text-2xl font-bold tracking-tight text-snow md:text-3xl lg:mb-5 lg:text-4xl">
                {cardHeading}
              </h3>
              <p className="mx-auto hidden max-w-sm text-sm font-normal leading-relaxed text-green-50/70 md:block md:text-base lg:mx-0 lg:max-w-none lg:text-lg">
                {cardDescription}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
