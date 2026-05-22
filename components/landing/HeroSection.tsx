"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import PhoneHero from "@/components/landing/PhoneHero";

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-24 lg:pt-52 lg:pb-40 overflow-hidden bg-white selection:bg-blue-100">
      {/* Refined Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-slate-50 rounded-full blur-[100px] opacity-80" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-5xl md:text-6xl lg:text-8xl font-black tracking-tight mb-8 leading-[0.95] text-slate-950">
                Freedom to borrow <br className="hidden md:block"/>
                <span className="text-emerald-500">your way.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-slate-500 mb-12 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium tracking-tight">
                Me2U is the interest-free peer lending platform for modern cooperatives. 
                Register, verify, and unlock ₦2,000 instantly.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12">
                <Link 
                  href="/register" 
                  className="w-full sm:w-auto px-10 py-5 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-xl hover:shadow-slate-200 active:scale-95 text-center text-lg"
                >
                  Create account
                </Link>
                <Link 
                  href="/login" 
                  className="w-full sm:w-auto px-10 py-5 bg-white hover:bg-slate-50 text-slate-950 font-bold rounded-2xl border border-slate-200 transition-all active:scale-95 text-center text-lg"
                >
                  Sign In
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4 text-sm font-bold text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  No Hidden Fees
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  P2P Verified
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Instant Bonus
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
