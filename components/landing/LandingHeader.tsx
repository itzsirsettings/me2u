"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggleIcon from "@/components/ThemeToggleIcon";
import { GlowCard } from "@/components/ui/spotlight-card";

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-navy/90 backdrop-blur-md border-b border-snow/5" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 relative flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="group inline-flex items-center" aria-label="Me2U home">
              <BrandLogo
                src="/me2u_nav_logo.svg"
                className="h-11 w-[7.75rem] rounded-[10px] bg-snow px-2 py-1.5 shadow-sm transition-transform duration-300 group-hover:scale-[1.03] sm:h-12 sm:w-36"
              />
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-10">
            <div 
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button className="flex items-center gap-1 font-medium text-sm text-snow/60 hover:text-snow transition-colors py-2">
                Products
                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${productsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <AnimatePresence>
                {productsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-1/2 w-[600px] -translate-x-1/2"
                  >
                    <GlowCard customSize glowColor="green" className="grid grid-cols-2 gap-6 rounded-2xl border border-snow/5 bg-slate/85 p-6 shadow-2xl backdrop-blur-md">
                      <div className="col-span-2 p-4 bg-navy/50 rounded-xl border border-snow/5">
                        <h3 className="font-medium text-green mb-1">Me2U Lending Flow</h3>
                        <p className="text-sm text-snow/60 mb-3">One app for verified wallets, peer matching, interest-free loans, and repayments.</p>
                        <Link href="/register" className="text-sm font-medium text-green hover:text-lime transition-colors">Create an account &rarr;</Link>
                      </div>
                      <div>
                        <Link href="/#loans" className="block group p-2 -m-2 rounded-lg hover:bg-snow/5">
                          <div className="font-medium text-snow group-hover:text-green mb-1 flex items-center gap-2 transition-colors">
                            <span className="text-lg text-green">⌁</span> 0% Loans
                          </div>
                          <p className="text-xs text-snow/40 font-normal">Access 0% interest loans from ₦5,000.</p>
                        </Link>
                      </div>
                      <div>
                        <Link href="/#marketplace" className="block group p-2 -m-2 rounded-lg hover:bg-snow/5">
                          <div className="font-medium text-snow group-hover:text-green mb-1 flex items-center gap-2 transition-colors">
                            <span className="text-lg text-green">▣</span> Peer Marketplace
                          </div>
                          <p className="text-xs text-snow/40 font-normal">Create borrow requests and lending offers.</p>
                        </Link>
                      </div>
                      <div>
                        <Link href="/#trust" className="block group p-2 -m-2 rounded-lg hover:bg-snow/5">
                          <div className="font-medium text-snow group-hover:text-green mb-1 flex items-center gap-2 transition-colors">
                            <span className="text-lg text-green">◈</span> Trust Score
                          </div>
                          <p className="text-xs text-snow/40 font-normal">Build trust from KYC and repayments.</p>
                        </Link>
                      </div>
                      <div>
                        <Link href="/#rewards" className="block group p-2 -m-2 rounded-lg hover:bg-snow/5">
                          <div className="font-medium text-snow group-hover:text-green mb-1 flex items-center gap-2 transition-colors">
                            <span className="text-lg text-green">✦</span> Referral Rewards
                          </div>
                          <p className="text-xs text-snow/40 font-normal">Earn ₦500 after referral loan repayment.</p>
                        </Link>
                      </div>
                    </GlowCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Link href="/security" className="font-medium text-sm text-snow/60 hover:text-snow transition-colors">
              Security
            </Link>
            <Link href="/#faqs" className="font-medium text-sm text-snow/60 hover:text-snow transition-colors">
              FAQs
            </Link>
            <Link href="/support" className="font-medium text-sm text-snow/60 hover:text-snow transition-colors">
              Support
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-8">
            <ThemeToggleIcon />
            <Link href="/login" className="font-medium text-sm text-snow/60 hover:text-snow transition-colors">
              Log In
            </Link>
            <Link href="/register" className="btn-primary">
              Open account
            </Link>
          </div>

          {/* Mobile Toggle */}
          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggleIcon />
            <button
              className="p-2 text-snow"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed inset-x-0 top-[72px] bg-navy border-b border-snow/5 shadow-2xl z-40 lg:hidden overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-4">
              <GlowCard customSize glowColor="green" className="rounded-xl bg-snow/5 p-4">
                <h3 className="font-medium text-green mb-1 text-sm">Products</h3>
                <div className="grid grid-cols-1 gap-3 mt-3">
                  <Link href="/#loans" className="text-sm font-normal text-snow/80" onClick={() => setMobileMenuOpen(false)}>0% Loans</Link>
                  <Link href="/#marketplace" className="text-sm font-normal text-snow/80" onClick={() => setMobileMenuOpen(false)}>Peer Marketplace</Link>
                  <Link href="/#trust" className="text-sm font-normal text-snow/80" onClick={() => setMobileMenuOpen(false)}>Trust Score</Link>
                </div>
              </GlowCard>
              <Link href="/security" className="p-3 font-normal text-snow/80 border-b border-snow/5" onClick={() => setMobileMenuOpen(false)}>Security</Link>
              <Link href="/#faqs" className="p-3 font-normal text-snow/80 border-b border-snow/5" onClick={() => setMobileMenuOpen(false)}>FAQs</Link>
              <Link href="/support" className="p-3 font-normal text-snow/80" onClick={() => setMobileMenuOpen(false)}>Support</Link>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Link href="/login" className="py-3 bg-snow/5 text-center font-medium rounded-pill text-snow text-sm" onClick={() => setMobileMenuOpen(false)}>
                  Log In
                </Link>
                <Link href="/register" className="btn-primary" onClick={() => setMobileMenuOpen(false)}>
                  Open account
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
