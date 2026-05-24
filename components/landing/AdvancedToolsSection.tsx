"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const tools = [
  {
    id: "deposit",
    title: "Start with a protected wallet.",
    description: "Pay the fixed ₦1,000 deposit and upload your transfer reference plus receipt. Complete KYC after your deposit is confirmed to unlock withdrawals and loans.",
    imageBg: "bg-snow",
    imageEl: (
      <div className="relative w-full aspect-square max-w-sm mx-auto">
        <div className="absolute inset-0 bg-lime/20 rounded-full blur-3xl opacity-60"></div>
        <div className="relative h-full w-full bg-snow rounded-[2rem] shadow-xl border border-navy/10 flex flex-col p-6 overflow-hidden">
          <div className="flex-1">
            <div className="text-center mb-8 pt-4">
              <span className="text-4xl font-extrabold text-navy">₦1,000</span>
              <p className="text-slate-light font-medium mt-2">Registration Fee</p>
            </div>
            <div className="space-y-3">
              <div className="h-12 bg-slate/5 rounded-xl border border-navy/10 flex items-center px-4">
                <div className="w-6 h-6 rounded bg-green/20 mr-3"></div>
                <div className="h-2 w-24 bg-slate/15 rounded-full"></div>
              </div>
              <div className="h-12 bg-slate/5 rounded-xl border border-navy/10 flex items-center px-4">
                <div className="w-6 h-6 rounded bg-lime/30 mr-3"></div>
                <div className="h-2 w-32 bg-slate/15 rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="mt-auto pt-6 border-t border-navy/10 text-center">
            <span className="inline-block px-4 py-2 bg-green text-navy text-xs font-bold rounded-full">Upload Receipt</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "marketplace",
    title: "Peer Marketplace.",
    description: "Borrowers and lenders meet in one shared market. Listings stay interest-free, clear, and tied to wallet balances and trust signals. Post the amount you need, keep the interest rate at 0%, and set a duration from 1 to 14 days.",
    imageBg: "bg-snow",
    reverse: true,
    imageEl: (
      <div className="relative w-full aspect-square max-w-sm mx-auto">
        <div className="absolute inset-0 bg-green/20 rounded-full blur-3xl opacity-60"></div>
        <div className="relative h-full w-full bg-snow rounded-[2rem] shadow-xl border border-navy/10 flex flex-col overflow-hidden">
          <div className="bg-navy px-6 py-5 flex justify-between items-center">
            <h4 className="text-snow font-bold">Marketplace Board</h4>
            <span className="px-2 py-1 bg-lime/15 rounded text-xs text-lime">0% Interest</span>
          </div>
          <div className="flex-1 p-6 flex flex-col gap-4 bg-slate/5">
            <div className="bg-snow p-4 rounded-2xl shadow-sm border border-navy/10">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green/20"></div>
                  <div>
                    <div className="h-2 w-16 bg-slate/15 rounded-full mb-1"></div>
                    <div className="h-2 w-10 bg-green/20 rounded-full"></div>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-light">14d</span>
              </div>
              <p className="text-xl font-bold text-navy mb-3">₦50,000</p>
              <button className="w-full py-2 bg-green text-navy rounded-lg text-sm font-bold">Fund this loan</button>
            </div>
            
            <div className="bg-snow p-4 rounded-2xl shadow-sm border border-navy/10 opacity-60">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-lime/30"></div>
                  <div>
                    <div className="h-2 w-16 bg-slate/15 rounded-full mb-1"></div>
                    <div className="h-2 w-10 bg-lime/30 rounded-full"></div>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-light">7d</span>
              </div>
              <p className="text-xl font-bold text-navy mb-3">₦10,000</p>
              <button className="w-full py-2 bg-lime/25 text-navy rounded-lg text-sm font-bold">Accept offer</button>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "loans",
    title: "Access 0% loans directly or from matched peers.",
    description: "Use Me2U for direct loans and peer marketplace loans with transparent durations, wallet checks, and 0% interest. 0% interest loan from ₦5,000 after your registration deposit and KYC are complete.",
    imageBg: "bg-snow",
    imageEl: (
      <div className="relative w-full aspect-square max-w-sm mx-auto">
        <div className="absolute inset-0 bg-lime/20 rounded-full blur-3xl opacity-60"></div>
        <div className="relative h-full w-full bg-navy rounded-[2rem] shadow-xl border border-lime/15 flex flex-col p-6 overflow-hidden">
          <div className="flex-1">
            <div className="mb-8 pt-4">
              <span className="text-4xl font-extrabold text-snow">₦5,000</span>
              <p className="text-lime font-bold mt-2">0% Interest</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-snow/60 mb-2">
                  <span>Repayment Progress</span>
                  <span className="text-snow">100%</span>
                </div>
                <div className="w-full h-2 bg-slate rounded-full overflow-hidden">
                  <div className="w-full h-full bg-green"></div>
                </div>
              </div>
              
              <div className="bg-snow/5 border border-lime/15 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm font-medium text-snow/70">Wallet Retained</span>
                <span className="text-sm font-bold text-snow">50%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
];

export default function AdvancedToolsSection() {
  return (
    <section className="py-40 bg-snow overflow-hidden" id="loans">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="max-w-4xl mb-32">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-medium text-navy mb-8 tracking-tight leading-[1.2]"
          >
            A refined flow from <br/>
            <span className="text-green">deposit to withdrawal.</span>
          </motion.h2>
        </div>

        <div className="flex flex-col gap-40 lg:gap-56">
          {tools.map((tool, index) => (
            <div 
              key={tool.id} 
              id={tool.id}
              className={`flex flex-col ${tool.reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16 lg:gap-32`}
            >
              <div className="flex-1 w-full">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h3 className="text-3xl md:text-5xl font-medium text-navy mb-8 tracking-tight leading-[1.2]">
                    {tool.title}
                  </h3>
                  <p className="text-lg md:text-xl text-slate-light font-normal leading-relaxed mb-10 tracking-tight">
                    {tool.description}
                  </p>
                  <Link 
                    href="/register" 
                    className="group inline-flex items-center gap-3 text-navy font-medium text-lg hover:text-green transition-colors"
                  >
                    Start your journey 
                    <span className="w-8 h-px bg-slate-light/20 group-hover:bg-green group-hover:w-12 transition-all duration-300"></span>
                  </Link>
                </motion.div>
              </div>
              
              <div className="flex-1 w-full">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full rounded-[32px] p-8 md:p-20 bg-snow border border-navy/5 shadow-[inset_0_2px_4px_rgba(8,19,32,0.03)]"
                >
                  {tool.imageEl}
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
