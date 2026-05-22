"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";

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
          scrolled ? "bg-navy/90 backdrop-blur-md border-b border-white/5" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 relative flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="group flex items-center gap-2">
              <div className="w-10 h-10 bg-green rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <span className="text-navy font-black text-xl">M</span>
              </div>
              <span className="text-xl font-medium text-white tracking-tight">
                Me2<span className="text-green">U</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-10">
            <div 
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button className="flex items-center gap-1 font-medium text-sm text-white/60 hover:text-white transition-colors py-2">
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
                    className="absolute top-full left-1/2 -translate-x-1/2 w-[600px] bg-slate rounded-2xl shadow-2xl border border-white/5 p-6 grid grid-cols-2 gap-6"
                  >
                    <div className="col-span-2 p-4 bg-navy/50 rounded-xl border border-white/5">
                      <h3 className="font-medium text-green mb-1">Me2U Lending Flow</h3>
                      <p className="text-sm text-white/60 mb-3">One app for verified wallets, peer matching, interest-free loans, and repayments.</p>
                      <Link href="/register" className="text-sm font-medium text-green hover:text-lime transition-colors">Create an account &rarr;</Link>
                    </div>
                    <div>
                      <Link href="/#loans" className="block group p-2 -m-2 rounded-lg hover:bg-white/5">
                        <div className="font-medium text-white group-hover:text-green mb-1 flex items-center gap-2 transition-colors">
                          <span className="text-lg text-green">⌁</span> 0% Loans
                        </div>
                        <p className="text-xs text-white/40 font-normal">Access 0% interest loans from ₦5,000.</p>
                      </Link>
                    </div>
                    <div>
                      <Link href="/#marketplace" className="block group p-2 -m-2 rounded-lg hover:bg-white/5">
                        <div className="font-medium text-white group-hover:text-green mb-1 flex items-center gap-2 transition-colors">
                          <span className="text-lg text-green">▣</span> Peer Marketplace
                        </div>
                        <p className="text-xs text-white/40 font-normal">Create borrow requests and lending offers.</p>
                      </Link>
                    </div>
                    <div>
                      <Link href="/#trust" className="block group p-2 -m-2 rounded-lg hover:bg-white/5">
                        <div className="font-medium text-white group-hover:text-green mb-1 flex items-center gap-2 transition-colors">
                          <span className="text-lg text-green">◈</span> Trust Score
                        </div>
                        <p className="text-xs text-white/40 font-normal">Build trust from KYC and repayments.</p>
                      </Link>
                    </div>
                    <div>
                      <Link href="/#rewards" className="block group p-2 -m-2 rounded-lg hover:bg-white/5">
                        <div className="font-medium text-white group-hover:text-green mb-1 flex items-center gap-2 transition-colors">
                          <span className="text-lg text-green">✦</span> Referral Rewards
                        </div>
                        <p className="text-xs text-white/40 font-normal">Earn ₦500 after referral loan repayment.</p>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Link href="/security" className="font-medium text-sm text-white/60 hover:text-white transition-colors">
              Security
            </Link>
            <Link href="/#faqs" className="font-medium text-sm text-white/60 hover:text-white transition-colors">
              FAQs
            </Link>
            <Link href="/support" className="font-medium text-sm text-white/60 hover:text-white transition-colors">
              Support
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-8">
            <Link href="/login" className="font-medium text-sm text-white/60 hover:text-white transition-colors">
              Log In
            </Link>
            <Link href="/register" className="btn-primary">
              Open account
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="lg:hidden p-2 text-white"
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
            className="fixed inset-x-0 top-[72px] bg-navy border-b border-white/5 shadow-2xl z-40 lg:hidden overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <h3 className="font-medium text-green mb-1 text-sm">Products</h3>
                <div className="grid grid-cols-1 gap-3 mt-3">
                  <Link href="/#loans" className="text-sm font-normal text-white/80" onClick={() => setMobileMenuOpen(false)}>0% Loans</Link>
                  <Link href="/#marketplace" className="text-sm font-normal text-white/80" onClick={() => setMobileMenuOpen(false)}>Peer Marketplace</Link>
                  <Link href="/#trust" className="text-sm font-normal text-white/80" onClick={() => setMobileMenuOpen(false)}>Trust Score</Link>
                </div>
              </div>
              <Link href="/security" className="p-3 font-normal text-white/80 border-b border-white/5" onClick={() => setMobileMenuOpen(false)}>Security</Link>
              <Link href="/#faqs" className="p-3 font-normal text-white/80 border-b border-white/5" onClick={() => setMobileMenuOpen(false)}>FAQs</Link>
              <Link href="/support" className="p-3 font-normal text-white/80" onClick={() => setMobileMenuOpen(false)}>Support</Link>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Link href="/login" className="py-3 bg-white/5 text-center font-medium rounded-pill text-white text-sm" onClick={() => setMobileMenuOpen(false)}>
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
