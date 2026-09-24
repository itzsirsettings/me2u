"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";

import BrandLogo from "@/components/BrandLogo";
import { GlowCard } from "@/components/ui/spotlight-card";

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const productsDropdownRef = useRef<HTMLDivElement>(null);
  const productsButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const closeProducts = useCallback(() => setProductsOpen(false), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (productsOpen) closeProducts();
        if (mobileMenuOpen) closeMobileMenu();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [productsOpen, mobileMenuOpen, closeProducts, closeMobileMenu]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        productsDropdownRef.current &&
        !productsDropdownRef.current.contains(e.target as Node) &&
        productsButtonRef.current &&
        !productsButtonRef.current.contains(e.target as Node)
      ) {
        closeProducts();
      }
    };
    if (productsOpen) {
      document.addEventListener("mousedown", onClickOutside);
      return () => document.removeEventListener("mousedown", onClickOutside);
    }
  }, [productsOpen, closeProducts]);

  const handleAnchorNavigate = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (href.startsWith("/#")) {
      const id = href.slice(2);
      closeProducts();
      closeMobileMenu();
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
          el.setAttribute("tabindex", "-1");
          (el).focus({ preventScroll: true });
        } else {
          router.push(href);
        }
      });
    } else {
      closeProducts();
      closeMobileMenu();
    }
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header
        className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
          scrolled ? "bg-navy/90 backdrop-blur-md border-b border-snow/5" : "bg-transparent"
        }`}
      >
        <div className="landing-container relative flex items-center justify-between h-20">
          <div className="flex-shrink-0 flex items-center">
            <Link
              href="/"
              className="group inline-flex items-center focus-visible:outline-0"
              aria-label="Me2U home"
            >
              <BrandLogo
                src="/me2u_nav_logo.svg"
                className="h-11 w-[7.75rem] rounded-[10px] bg-snow px-2 py-1.5 shadow-sm transition-transform duration-300 group-hover:scale-[1.03] sm:h-12 sm:w-36"
              />
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-10" aria-label="Primary">
            <div className="relative" ref={productsDropdownRef}>
              <button
                ref={productsButtonRef}
                type="button"
                aria-haspopup="true"
                aria-expanded={productsOpen}
                aria-controls="products-dropdown"
                onClick={() => setProductsOpen((v) => !v)}
                onMouseEnter={() => setProductsOpen(true)}
                onMouseLeave={() => setProductsOpen(false)}
                className="flex items-center gap-1 font-medium text-sm text-snow/70 hover:text-snow transition-colors py-2 min-h-[44px]"
              >
                Products
                <svg
                  aria-hidden="true"
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    productsOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              <AnimatePresence>
                {productsOpen && (
                  <motion.div
                    id="products-dropdown"
                    role="menu"
                    aria-label="Products menu"
                    ref={productsDropdownRef}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: reducedMotion ? 0 : 0.2 }}
                    className="absolute top-full left-1/2 w-[600px] -translate-x-1/2 pt-2"
                  >
                    <GlowCard
                      customSize
                      glowColor="green"
                      className="grid grid-cols-2 gap-6 rounded-2xl border border-snow/5 bg-slate/90 p-6 shadow-2xl backdrop-blur-md"
                    >
                      <div className="col-span-2 p-4 bg-navy/60 rounded-xl border border-snow/5">
                        <h3 className="font-medium text-green mb-1">Me2U&nbsp;Lending Flow</h3>
                        <p className="text-sm text-snow/60 mb-3">
                          One app for verified wallets, peer matching, interest-free loans, and
                          repayments.
                        </p>
                        <Link
                          href="/register"
                          className="text-sm font-medium text-green hover:text-lime transition-colors inline-flex items-center gap-1"
                        >
                          Create an account
                          <span aria-hidden="true">&rarr;</span>
                        </Link>
                      </div>
                      {[
                        {
                          href: "/#loans",
                          icon: "⌁",
                          title: "0% Loans",
                          desc: "Access 0% interest loans.",
                        },
                        {
                          href: "/#marketplace",
                          icon: "▣",
                          title: "Peer Marketplace",
                          desc: "Create borrow requests and lending offers.",
                        },
                        {
                          href: "/#trust-score",
                          icon: "◈",
                          title: "Trust Score",
                          desc: "Build trust from verified actions.",
                        },
                        {
                          href: "/#features",
                          icon: "✦",
                          title: "Referral Rewards",
                          desc: "Unlock rewards with trusted invites.",
                        },
                      ].map((item) => (
                        <Link
                          key={item.title}
                          href={item.href}
                          onClick={handleAnchorNavigate(item.href)}
                          role="menuitem"
                          className="block group p-2 -m-2 rounded-lg hover:bg-snow/5 focus-visible:outline-0"
                        >
                          <div className="font-medium text-snow group-hover:text-green mb-1 flex items-center gap-2 transition-colors">
                            <span className="text-lg text-green" aria-hidden="true">
                              {item.icon}
                            </span>
                            {item.title}
                          </div>
                          <p className="text-xs text-snow/50 font-normal leading-snug">
                            {item.desc}
                          </p>
                        </Link>
                      ))}
                    </GlowCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              href="/#how-it-works"
              onClick={handleAnchorNavigate("/#how-it-works")}
              className="font-medium text-sm text-snow/70 hover:text-snow transition-colors min-h-[44px] inline-flex items-center"
            >
              How it works
            </Link>
            <Link
              href="/#features"
              onClick={handleAnchorNavigate("/#features")}
              className="font-medium text-sm text-snow/70 hover:text-snow transition-colors min-h-[44px] inline-flex items-center"
            >
              Features
            </Link>
            <Link
              href="/#trust-score"
              onClick={handleAnchorNavigate("/#trust-score")}
              className="font-medium text-sm text-snow/70 hover:text-snow transition-colors min-h-[44px] inline-flex items-center"
            >
              Trust Score
            </Link>
            <Link
              href="/#community-circles"
              onClick={handleAnchorNavigate("/#community-circles")}
              className="font-medium text-sm text-snow/70 hover:text-snow transition-colors min-h-[44px] inline-flex items-center"
            >
              Circles
            </Link>
            <Link
              href="/#faq"
              onClick={handleAnchorNavigate("/#faq")}
              className="font-medium text-sm text-snow/70 hover:text-snow transition-colors min-h-[44px] inline-flex items-center"
            >
              FAQs
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="/login"
              className="font-medium text-sm text-snow/70 hover:text-snow transition-colors min-h-[44px] inline-flex items-center px-2"
            >
              Log In
            </Link>
            <Link href="/register" className="btn-primary min-h-[44px]">
              Open account
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              className="p-2.5 text-snow min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu-panel"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            ref={mobileMenuRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            className="fixed inset-x-0 top-20 bottom-0 bg-navy/98 backdrop-blur-md border-b border-snow/5 shadow-2xl z-40 lg:hidden overflow-y-auto overscroll-contain pb-6"
          >
            <nav className="p-4 flex flex-col gap-1" aria-label="Mobile">
              <div className="text-[11px] font-medium text-snow/40 uppercase tracking-widest px-3 pt-2 pb-2">
                Products
              </div>
              {[
                { href: "/#loans", label: "0% Loans" },
                { href: "/#marketplace", label: "Peer Marketplace" },
                { href: "/#trust-score", label: "Trust Score" },
                { href: "/#features", label: "Referral Rewards" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={handleAnchorNavigate(l.href)}
                  className="p-3 rounded-xl text-[15px] text-snow/85 hover:bg-snow/5 min-h-[48px] inline-flex items-center"
                >
                  {l.label}
                </Link>
              ))}

              <div className="text-[11px] font-medium text-snow/40 uppercase tracking-widest px-3 pt-4 pb-2">
                Explore
              </div>
              {[
                { href: "/#community-circles", label: "Circles" },
                { href: "/#features", label: "Features" },
                { href: "/#trust-score", label: "Trust Score" },
                { href: "/#comparison", label: "Why Me2U" },
                { href: "/#faq", label: "FAQs" },
                { href: "/support", label: "Support" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={
                    l.href.startsWith("/#") ? handleAnchorNavigate(l.href) : closeMobileMenu
                  }
                  className="p-3 rounded-xl text-[15px] text-snow/85 hover:bg-snow/5 min-h-[48px] inline-flex items-center border-b border-snow/5 last:border-b-0"
                >
                  {l.label}
                </Link>
              ))}

              <div className="grid grid-cols-2 gap-3 mt-6 px-1">
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="py-3.5 bg-snow/5 text-center font-medium rounded-pill text-snow text-sm min-h-[48px] inline-flex items-center justify-center border border-snow/10"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={closeMobileMenu}
                  className="btn-primary min-h-[48px]"
                >
                  Open account
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
