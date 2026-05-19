"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function LandingCTA() {
  return (
    <section className="py-24 bg-[var(--color-bg-primary)] relative overflow-hidden">
      <div className="absolute inset-0 bg-[var(--color-hover-soft)] opacity-50"></div>
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-[var(--color-accent-primary)] rounded-[50px] p-10 md:p-16 lg:p-24 text-center max-w-5xl mx-auto shadow-[0_20px_50px_var(--color-shadow)] relative overflow-hidden"
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[var(--color-accent-deep)] rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-50"></div>

          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold text-[var(--color-on-accent)] mb-6 tracking-tight">
              Secure peer lending.
            </h2>
            <p className="text-xl md:text-2xl text-[var(--color-on-accent)] opacity-90 font-sans font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
              Register, complete your deposit, verify KYC, then use Me2U to fund your wallet, match with peers, and manage 0% loans.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link 
                href="/register" 
                className="w-full sm:w-auto px-10 py-5 bg-[var(--color-on-accent)] text-[var(--color-accent-primary)] font-bold rounded-[50px] transition-all shadow-[2px_2px_0px_var(--color-shadow)] hover:opacity-90 active:translate-y-[2px] active:shadow-none text-lg"
              >
                Create your Me2U account
              </Link>
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-10 py-5 bg-[var(--color-accent-deep)] hover:bg-[var(--color-accent-deep)] border border-white/20 text-[var(--color-on-accent)] font-bold rounded-[50px] transition-all shadow-[2px_2px_0px_var(--color-shadow)] active:translate-y-[2px] active:shadow-none text-lg"
              >
                Login to wallet
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
