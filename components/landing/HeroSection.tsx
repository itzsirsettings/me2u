"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import PhoneHero from "@/components/landing/PhoneHero";

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-[#0B1320] text-white">
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-50" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 opacity-50" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >

              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                Freedom to <br className="hidden md:block"/>
                <span className="text-blue-400">borrow your way.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Register and verify your wallet. Borrow or lend at 0%. 
                <br className="hidden md:block"/>
                Claim your ₦2,000 welcome bonus after KYC.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
                <Link 
                  href="/register" 
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95 text-center text-lg"
                >
                  Create account
                </Link>
                <Link 
                  href="/login" 
                  className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-2xl border border-white/10 transition-all active:scale-95 text-center text-lg backdrop-blur-sm"
                >
                  Login
                </Link>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-6 text-sm font-medium text-slate-400">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  ₦2,000 welcome bonus
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  0% direct & peer loans
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex-1 w-full max-w-lg lg:max-w-none relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative z-10"
            >
              <div className="mx-auto w-full max-w-[423px]">
                <PhoneHero />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
