"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { companyInfo } from "@/lib/legal-content";
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
          scrolled ? "bg-white/80 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <BrandLogo className="h-10 w-10" />
            <div className="flex flex-col">
              <span className="font-extrabold text-xl leading-tight text-slate-900 group-hover:text-blue-700 transition-colors">
                Me2U
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500">
                by {companyInfo.legalName}
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
              <button className="flex items-center gap-1 font-medium text-slate-700 hover:text-blue-600 transition-colors py-2">
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
                    className="absolute top-full left-1/2 -translate-x-1/2 w-[600px] bg-white rounded-2xl shadow-xl border border-slate-100 p-6 grid grid-cols-2 gap-6"
                  >
                    <div className="col-span-2 p-4 bg-blue-50 rounded-xl">
                      <h3 className="font-bold text-blue-900 mb-1">Me2U Lending Flow</h3>
                      <p className="text-sm text-blue-700 mb-3">One app for verified wallets, peer matching, interest-free loans, and repayments.</p>
                      <Link href="/register" className="text-sm font-semibold text-blue-600 hover:text-blue-800">Create an account &rarr;</Link>
                    </div>
                    <div>
                      <Link href="/#loans" className="block group p-2 -m-2 rounded-lg hover:bg-slate-50">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 mb-1 flex items-center gap-2">
                          <span className="text-lg">⌁</span> 0% Loans
                        </div>
                        <p className="text-xs text-slate-500">Access 0% interest loans from ₦5,000.</p>
                      </Link>
                    </div>
                    <div>
                      <Link href="/#marketplace" className="block group p-2 -m-2 rounded-lg hover:bg-slate-50">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 mb-1 flex items-center gap-2">
                          <span className="text-lg">▣</span> Peer Marketplace
                        </div>
                        <p className="text-xs text-slate-500">Create borrow requests and lending offers.</p>
                      </Link>
                    </div>
                    <div>
                      <Link href="/#trust" className="block group p-2 -m-2 rounded-lg hover:bg-slate-50">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 mb-1 flex items-center gap-2">
                          <span className="text-lg">◈</span> Trust Score
                        </div>
                        <p className="text-xs text-slate-500">Build trust from KYC and repayments.</p>
                      </Link>
                    </div>
                    <div>
                      <Link href="/#rewards" className="block group p-2 -m-2 rounded-lg hover:bg-slate-50">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 mb-1 flex items-center gap-2">
                          <span className="text-lg">✦</span> Referral Rewards
                        </div>
                        <p className="text-xs text-slate-500">Earn ₦500 per verified referral.</p>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Link href="/security" className="font-medium text-slate-700 hover:text-blue-600 transition-colors">
              Security
            </Link>
            <Link href="/#faqs" className="font-medium text-slate-700 hover:text-blue-600 transition-colors">
              FAQs
            </Link>
            <Link href="/support" className="font-medium text-slate-700 hover:text-blue-600 transition-colors">
              Support
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <Link href="/login" className="font-medium text-slate-700 hover:text-blue-600 transition-colors">
              Login
            </Link>
            <Link href="/register" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-sm hover:shadow active:scale-95">
              Create Account
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="lg:hidden p-2 text-slate-600"
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
            className="fixed inset-x-0 top-[72px] bg-white border-b border-slate-100 shadow-xl z-40 lg:hidden overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <h3 className="font-bold text-blue-900 mb-1">Products</h3>
                <div className="grid grid-cols-1 gap-3 mt-3">
                  <Link href="/#loans" className="text-sm font-medium text-blue-800" onClick={() => setMobileMenuOpen(false)}>0% Loans</Link>
                  <Link href="/#marketplace" className="text-sm font-medium text-blue-800" onClick={() => setMobileMenuOpen(false)}>Peer Marketplace</Link>
                  <Link href="/#trust" className="text-sm font-medium text-blue-800" onClick={() => setMobileMenuOpen(false)}>Trust Score</Link>
                </div>
              </div>
              <Link href="/security" className="p-3 font-medium text-slate-800 border-b border-slate-50" onClick={() => setMobileMenuOpen(false)}>Security</Link>
              <Link href="/#faqs" className="p-3 font-medium text-slate-800 border-b border-slate-50" onClick={() => setMobileMenuOpen(false)}>FAQs</Link>
              <Link href="/support" className="p-3 font-medium text-slate-800" onClick={() => setMobileMenuOpen(false)}>Support</Link>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Link href="/login" className="px-4 py-3 bg-slate-100 text-center font-medium rounded-xl text-slate-800" onClick={() => setMobileMenuOpen(false)}>
                  Login
                </Link>
                <Link href="/register" className="px-4 py-3 bg-blue-600 text-center font-medium rounded-xl text-white" onClick={() => setMobileMenuOpen(false)}>
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
