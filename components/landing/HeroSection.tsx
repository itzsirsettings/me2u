"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import PhoneHero from "@/components/landing/PhoneHero";

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-24 lg:pt-52 lg:pb-40 overflow-hidden bg-navy selection:bg-green/30">
      {/* Refined Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-green/5 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-lime/5 rounded-full blur-[100px] opacity-80" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-block px-4 py-1.5 rounded-full bg-green/10 text-green text-xs font-bold mb-6 tracking-wide">
                ✓ CBN licensed · NDIC insured
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-8xl font-medium tracking-tight mb-8 leading-[1.1] text-white">
                Zero-interest lending, <br className="hidden md:block"/>
                <span className="text-green">powered by trust.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-white/60 mb-12 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal tracking-tight">
                Send, borrow, and repay with people you trust. No interest, no hidden fees — fair P2P finance built for Nigeria.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12">
                <Link 
                  href="/register" 
                  className="btn-primary w-full sm:w-auto text-lg h-auto py-4 px-10"
                >
                  Open account
                </Link>
                <Link 
                  href="/login" 
                  className="btn-ghost text-white border-white/20 w-full sm:w-auto text-lg h-auto py-4 px-10"
                >
                  Learn more
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4 text-xs font-medium text-white/40 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green" />
                  No Interest
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green" />
                  No Hidden Fees
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green" />
                  P2P Verified
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex-1 w-full max-w-lg lg:max-w-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            >
              <PhoneHero />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
