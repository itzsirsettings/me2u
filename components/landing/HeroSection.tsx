"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-[#031335] text-white">
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm shadow-xl">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
                <span className="text-sm font-medium text-slate-200 tracking-wide">0% Interest Peer Lending</span>
              </div>
              
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
              {/* Abstract App Mockup instead of a real image to ensure it looks premium without needing assets */}
              <div className="relative mx-auto w-full max-w-[320px] aspect-[1/2] rounded-[2.5rem] bg-slate-900 border-[8px] border-slate-800 shadow-2xl shadow-blue-900/50 overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-xl w-1/3 mx-auto z-20"></div>
                
                {/* App UI Representation */}
                <div className="absolute inset-0 bg-slate-50 flex flex-col p-5 pt-10">
                  <div className="flex justify-between items-center mb-8">
                    <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                    <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Verified</div>
                  </div>
                  
                  <div className="bg-blue-600 rounded-2xl p-5 text-white mb-6 shadow-lg shadow-blue-600/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
                    <p className="text-blue-100 text-xs font-medium mb-1 relative z-10">Wallet Balance</p>
                    <h3 className="text-3xl font-bold relative z-10">₦12,000.00</h3>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3 mb-8">
                    {['Fund', 'Market', 'Loans', 'KYC'].map(label => (
                      <div key={label} className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                          <div className="w-5 h-5 bg-blue-100 rounded-md"></div>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500">{label}</span>
                      </div>
                    ))}
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 mb-3">Approved wallet activity</h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100"></div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Registration deposit</p>
                          <p className="text-[10px] text-slate-500">Deposit proof submitted</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-900">₦1,000</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100"></div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Welcome bonus</p>
                          <p className="text-[10px] text-slate-500">KYC Verified</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">+₦2,000</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <motion.div 
                animate={{ y: [0, -10, 0] }} 
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute -right-6 top-1/4 bg-white rounded-xl p-4 shadow-xl border border-slate-100 z-20 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">0%</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Direct Loan</p>
                  <p className="text-sm font-bold text-slate-900">Interest-free</p>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 10, 0] }} 
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                className="absolute -left-8 bottom-1/4 bg-slate-900 rounded-xl p-4 shadow-xl border border-slate-700 z-20 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-emerald-400 text-xl">✓</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Trust Score</p>
                  <p className="text-sm font-bold text-white">Verified</p>
                </div>
              </motion.div>

            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
