"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { companyInfo } from "@/lib/legal-content";

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
          scrolled ? "bg-[var(--color-glass-bg)] backdrop-blur-md shadow-sm py-3 border-b border-[var(--color-glass-border)]" : "bg-transparent py-5"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-[50px] bg-[var(--color-accent-primary)] flex items-center justify-center text-[var(--color-on-accent)] font-bold text-xl group-hover:opacity-90 transition-colors">
              M
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl leading-tight text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                Me2U
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-secondary)]">
                by {companyInfo.tradingName}
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            <div 
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button className="flex items-center gap-1 font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)] transition-colors py-2">
                Products
                <svg className={`w-4 h-4 transition-transform duration-200 ${productsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    className="absolute top-full left-1/2 -translate-x-1/2 w-[600px] bg-[var(--color-bg-card)] rounded-[50px] shadow-[0_20px_50px_var(--color-shadow)] border border-[var(--color-border)] p-6 grid grid-cols-2 gap-6"
                  >
                    <div className="col-span-2 p-6 bg-[var(--color-hover-soft)] rounded-[50px]">
                      <h3 className="font-bold text-[var(--color-accent-deep)] mb-1">Me2U Lending Flow</h3>
                      <p className="text-sm text-[var(--color-text-primary)] mb-3">One app for verified wallets, peer matching, interest-free loans, and repayments.</p>
                      <Link href="/register" className="text-sm font-semibold text-[var(--color-accent-primary)] hover:underline">Create an account &rarr;</Link>
                    </div>
                    <div>
                      <Link href="/#loans" className="block group p-4 -m-2 rounded-[50px] hover:bg-[var(--color-bg-secondary)] transition-colors">
                        <div className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] mb-1 flex items-center gap-2">
                          <span className="text-lg">⌁</span> Direct Loans
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Access direct loans from ₦5,000.</p>
                      </Link>
                    </div>
                    <div>
                      <Link href="/#marketplace" className="block group p-4 -m-2 rounded-[50px] hover:bg-[var(--color-bg-secondary)] transition-colors">
                        <div className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] mb-1 flex items-center gap-2">
                          <span className="text-lg">▣</span> Peer Marketplace
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Create borrow requests and lending offers.</p>
                      </Link>
                    </div>
                    <div>
                      <Link href="/#trust" className="block group p-4 -m-2 rounded-[50px] hover:bg-[var(--color-bg-secondary)] transition-colors">
                        <div className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] mb-1 flex items-center gap-2">
                          <span className="text-lg">◈</span> Trust Score
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Build trust from KYC and repayments.</p>
                      </Link>
                    </div>
                    <div>
                      <Link href="/#rewards" className="block group p-4 -m-2 rounded-[50px] hover:bg-[var(--color-bg-secondary)] transition-colors">
                        <div className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] mb-1 flex items-center gap-2">
                          <span className="text-lg">✦</span> Referral Rewards
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Earn ₦500 per verified referral.</p>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Link href="/security" className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)] transition-colors">
              Security
            </Link>
            <Link href="/#faqs" className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)] transition-colors">
              FAQs
            </Link>
            <Link href="/support" className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)] transition-colors">
              Support
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <Link href="/login" className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)] transition-colors px-4 py-2">
              Login
            </Link>
            <Link href="/register" className="px-5 py-2.5 bg-[var(--color-accent-primary)] text-[var(--color-on-accent)] font-semibold rounded-[50px] transition-all shadow-[2px_2px_0px_var(--color-shadow)] hover:opacity-90 active:translate-y-[2px] active:shadow-none">
              Create Account
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="lg:hidden p-2 text-[var(--color-text-primary)]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed inset-x-0 top-[72px] bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] shadow-xl z-40 lg:hidden overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-4">
              <div className="p-4 bg-[var(--color-hover-soft)] rounded-[50px]">
                <h3 className="font-bold text-[var(--color-accent-deep)] mb-1 px-4">Products</h3>
                <div className="grid grid-cols-1 gap-3 mt-3 px-4">
                  <Link href="/#loans" className="text-sm font-medium text-[var(--color-accent-primary)]" onClick={() => setMobileMenuOpen(false)}>Direct Loans</Link>
                  <Link href="/#marketplace" className="text-sm font-medium text-[var(--color-accent-primary)]" onClick={() => setMobileMenuOpen(false)}>Peer Marketplace</Link>
                  <Link href="/#trust" className="text-sm font-medium text-[var(--color-accent-primary)]" onClick={() => setMobileMenuOpen(false)}>Trust Score</Link>
                </div>
              </div>
              <Link href="/security" className="p-4 font-medium text-[var(--color-text-primary)] border-b border-[var(--color-border)]" onClick={() => setMobileMenuOpen(false)}>Security</Link>
              <Link href="/#faqs" className="p-4 font-medium text-[var(--color-text-primary)] border-b border-[var(--color-border)]" onClick={() => setMobileMenuOpen(false)}>FAQs</Link>
              <Link href="/support" className="p-4 font-medium text-[var(--color-text-primary)]" onClick={() => setMobileMenuOpen(false)}>Support</Link>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Link href="/login" className="px-4 py-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-center font-bold rounded-[50px] text-[var(--color-text-primary)]" onClick={() => setMobileMenuOpen(false)}>
                  Login
                </Link>
                <Link href="/register" className="px-4 py-4 bg-[var(--color-accent-primary)] text-center font-bold rounded-[50px] text-[var(--color-on-accent)]" onClick={() => setMobileMenuOpen(false)}>
                  Create Account
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
