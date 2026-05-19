"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[var(--color-accent-primary)]/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-50" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[var(--color-accent-deep)]/10 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 opacity-50" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-extrabold tracking-tight mb-6 leading-[1.1]">
                Freedom to <br className="hidden md:block"/>
                <span className="text-[var(--color-accent-primary)]">borrow your way.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-[var(--color-text-secondary)] mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-sans font-medium">
                Register and verify your wallet. Borrow or lend directly. 
                <br className="hidden md:block"/>
                Claim your ₦2,000 welcome bonus after KYC.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
                <Link 
                  href="/register" 
                  className="w-full sm:w-auto px-8 py-4 bg-[var(--color-accent-primary)] hover:opacity-90 text-[var(--color-on-accent)] font-semibold rounded-[50px] transition-all shadow-[2px_2px_0px_var(--color-shadow)] active:translate-y-[2px] active:shadow-none text-center text-lg"
                >
                  Create account
                </Link>
                <Link 
                  href="/login" 
                  className="w-full sm:w-auto px-8 py-4 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-hover-soft)] text-[var(--color-text-primary)] font-semibold rounded-[50px] border border-[var(--color-border)] transition-all shadow-[2px_2px_0px_var(--color-shadow)] active:translate-y-[2px] active:shadow-none text-center text-lg backdrop-blur-sm"
                >
                  Login
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm font-medium text-[var(--color-text-secondary)]">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  ₦2,000 welcome bonus
                </div>
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  Direct & peer loans
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
              <div className="relative mx-auto w-full max-w-[320px] aspect-[1/2] rounded-[50px] bg-[var(--color-bg-card)] border-[8px] border-[var(--color-bg-secondary)] shadow-[0_20px_50px_var(--color-shadow)] overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-6 bg-[var(--color-bg-secondary)] rounded-b-[20px] w-1/3 mx-auto z-20"></div>
                
                <div className="absolute inset-0 flex flex-col p-5 pt-10">
                  <div className="flex justify-between items-center mb-8">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-accent-primary)] text-[var(--color-on-accent)] flex items-center justify-center font-bold">MU</div>
                    <div className="px-3 py-1 bg-[var(--color-positive-bg)] text-[var(--color-positive-text)] text-xs font-bold rounded-full">Verified</div>
                  </div>
                  
                  <div className="bg-[var(--color-accent-primary)] rounded-[50px] p-5 text-[var(--color-on-accent)] mb-6 shadow-[0_8px_20px_var(--color-shadow)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
                    <p className="opacity-90 text-xs font-medium mb-1 relative z-10">Wallet Balance</p>
                    <h3 className="text-3xl font-display font-bold relative z-10">₦12,000.00</h3>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3 mb-8">
                    {['Receive', 'Market', 'Loans', 'KYC'].map((label, i) => {
                      const colors = [
                        "bg-[#c9c0f2] text-[#07026f]",
                        "bg-[#ffdfad] text-[#7a3f00]",
                        "bg-[#e0a9f0] text-[#07026f]",
                        "bg-[#9adbc4] text-[#00406b]"
                      ];
                      return (
                        <div key={label} className="flex flex-col items-center gap-2">
                          <div className={`w-12 h-12 rounded-full ${colors[i]} flex items-center justify-center`}>
                            <div className="w-5 h-5 bg-black/10 rounded-md"></div>
                          </div>
                          <span className="text-[10px] font-bold text-[var(--color-text-primary)]">{label}</span>
                        </div>
                      )
                    })}
                  </div>

                  <h4 className="text-xs font-bold text-[var(--color-text-primary)] mb-3">Recent Activity</h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between p-3 px-4 bg-[var(--color-bg-secondary)] rounded-[50px] border border-[var(--color-border)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-bg-primary)]"></div>
                        <div>
                          <p className="text-xs font-bold text-[var(--color-text-primary)]">Registration deposit</p>
                          <p className="text-[10px] text-[var(--color-text-secondary)]">Deposit proof submitted</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">₦1,000</span>
                    </div>
                    <div className="flex items-center justify-between p-3 px-4 bg-[var(--color-bg-secondary)] rounded-[50px] border border-[var(--color-border)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-bg-primary)]"></div>
                        <div>
                          <p className="text-xs font-bold text-[var(--color-text-primary)]">Welcome bonus</p>
                          <p className="text-[10px] text-[var(--color-text-secondary)]">KYC Verified</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[var(--color-positive-text)]">+₦2,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
