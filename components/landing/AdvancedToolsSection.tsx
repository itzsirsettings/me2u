"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const tools = [
  {
    id: "deposit",
    tag: "Protected Onboarding",
    title: "Start with a protected wallet.",
    description: "Pay the fixed ₦1,000 deposit and upload your transfer reference plus receipt. Complete KYC after your deposit is confirmed to unlock withdrawals and loans.",
    imageBg: "bg-[var(--color-hover-soft)]",
    imageEl: (
      <div className="relative w-full aspect-square max-w-sm mx-auto">
        <div className="absolute inset-0 bg-[var(--color-accent-primary)] rounded-[50px] blur-3xl opacity-20"></div>
        <div className="relative h-full w-full bg-[var(--color-bg-card)] rounded-[50px] shadow-[0_20px_50px_var(--color-shadow)] border border-[var(--color-border)] flex flex-col p-6 overflow-hidden">
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[var(--color-text-secondary)] mb-6 uppercase tracking-wider">Step 1: Deposit</h4>
            <div className="text-center mb-8">
              <span className="text-4xl font-display font-extrabold text-[var(--color-text-primary)]">₦1,000</span>
              <p className="text-[var(--color-text-secondary)] font-medium mt-2">Registration Fee</p>
            </div>
            <div className="space-y-3">
              <div className="h-12 bg-[var(--color-bg-secondary)] rounded-[50px] border border-[var(--color-border)] flex items-center px-4">
                <div className="w-6 h-6 rounded-[10px] bg-[var(--color-hover-soft)] mr-3"></div>
                <div className="h-2 w-24 bg-[var(--color-text-secondary)] opacity-20 rounded-[50px]"></div>
              </div>
              <div className="h-12 bg-[var(--color-bg-secondary)] rounded-[50px] border border-[var(--color-border)] flex items-center px-4">
                <div className="w-6 h-6 rounded-[10px] bg-[var(--color-positive-bg)] mr-3"></div>
                <div className="h-2 w-32 bg-[var(--color-text-secondary)] opacity-20 rounded-[50px]"></div>
              </div>
            </div>
          </div>
          <div className="mt-auto pt-6 border-t border-[var(--color-border)] text-center">
            <span className="inline-block px-4 py-2 bg-[var(--color-accent-primary)] text-[var(--color-on-accent)] text-xs font-bold rounded-[50px]">Upload Receipt</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "marketplace",
    tag: "A lending marketplace for both sides",
    title: "Peer Marketplace.",
    description: "Borrowers and lenders meet in one shared market. Listings stay interest-free, clear, and tied to wallet balances and trust signals. Post the amount you need, keep the interest rate at 0%, and set a duration from 1 to 14 days.",
    imageBg: "bg-[var(--color-positive-bg)]",
    reverse: true,
    imageEl: (
      <div className="relative w-full aspect-square max-w-sm mx-auto">
        <div className="absolute inset-0 bg-[var(--color-accent-primary)] rounded-[50px] blur-3xl opacity-20"></div>
        <div className="relative h-full w-full bg-[var(--color-bg-card)] rounded-[50px] shadow-[0_20px_50px_var(--color-shadow)] border border-[var(--color-border)] flex flex-col overflow-hidden">
          <div className="bg-[var(--color-accent-deep)] px-6 py-5 flex justify-between items-center">
            <h4 className="text-[var(--color-on-accent)] font-bold">Marketplace Board</h4>
            <span className="px-2 py-1 bg-white/10 rounded-[50px] text-xs text-[var(--color-on-accent)]">0% Interest</span>
          </div>
          <div className="flex-1 p-6 flex flex-col gap-4 bg-[var(--color-bg-secondary)]">
            <div className="bg-[var(--color-bg-card)] p-4 rounded-[50px] shadow-[2px_2px_0px_var(--color-shadow)] border border-[var(--color-border)]">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[50px] bg-[var(--color-bg-secondary)]"></div>
                  <div>
                    <div className="h-2 w-16 bg-[var(--color-text-secondary)] opacity-20 rounded-[50px] mb-1"></div>
                    <div className="h-2 w-10 bg-[var(--color-positive-bg)] rounded-[50px]"></div>
                  </div>
                </div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)]">14d</span>
              </div>
              <p className="text-xl font-display font-bold text-[var(--color-text-primary)] mb-3">₦50,000</p>
              <button className="w-full py-2 bg-[var(--color-hover-soft)] text-[var(--color-accent-primary)] rounded-[50px] text-sm font-bold">Fund this loan</button>
            </div>
            
            <div className="bg-[var(--color-bg-card)] p-4 rounded-[50px] shadow-[2px_2px_0px_var(--color-shadow)] border border-[var(--color-border)] opacity-50">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[50px] bg-[var(--color-bg-secondary)]"></div>
                  <div>
                    <div className="h-2 w-16 bg-[var(--color-text-secondary)] opacity-20 rounded-[50px] mb-1"></div>
                    <div className="h-2 w-10 bg-[var(--color-hover-soft)] rounded-[50px]"></div>
                  </div>
                </div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)]">7d</span>
              </div>
              <p className="text-xl font-display font-bold text-[var(--color-text-primary)] mb-3">₦10,000</p>
              <button className="w-full py-2 bg-[var(--color-positive-bg)] text-[var(--color-positive-text)] rounded-[50px] text-sm font-bold">Accept offer</button>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "loans",
    tag: "0% Loans",
    title: "Access 0% loans directly or from matched peers.",
    description: "Use Me2U for direct loans and peer marketplace loans with transparent durations, wallet checks, and 0% interest. 0% interest loan from ₦5,000 after your registration deposit and KYC are complete.",
    imageBg: "bg-[var(--color-bg-secondary)]",
    imageEl: (
      <div className="relative w-full aspect-square max-w-sm mx-auto">
        <div className="absolute inset-0 bg-[var(--color-accent-deep)] rounded-[50px] blur-3xl opacity-20"></div>
        <div className="relative h-full w-full bg-[var(--color-accent-deep)] rounded-[50px] shadow-[0_20px_50px_var(--color-shadow)] border border-white/10 flex flex-col p-6 overflow-hidden">
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[var(--color-on-accent)] opacity-70 mb-6 uppercase tracking-wider">Loan Status</h4>
            <div className="mb-8">
              <span className="text-4xl font-display font-extrabold text-[var(--color-on-accent)]">₦5,000</span>
              <p className="text-[var(--color-accent-primary)] font-bold mt-2">0% Interest</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-[var(--color-on-accent)] opacity-80 mb-2">
                  <span>Repayment Progress</span>
                  <span className="text-[var(--color-on-accent)]">100%</span>
                </div>
                <div className="w-full h-2 bg-black/20 rounded-[50px] overflow-hidden">
                  <div className="w-full h-full bg-[var(--color-accent-primary)]"></div>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-[50px] p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-on-accent)] opacity-90">Wallet Retained</span>
                <span className="text-sm font-bold text-[var(--color-on-accent)]">50%</span>
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
    <section className="py-24 bg-[var(--color-bg-primary)] overflow-hidden" id="loans">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-display font-extrabold text-[var(--color-text-primary)] mb-6 tracking-tight"
          >
            A polished flow from <br className="hidden md:block"/>deposit to withdrawal.
          </motion.h2>
        </div>

        <div className="flex flex-col gap-24 lg:gap-32">
          {tools.map((tool, index) => (
            <div 
              key={tool.id} 
              id={tool.id}
              className={`flex flex-col ${tool.reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-24`}
            >
              <div className="flex-1 w-full">
                <motion.div
                  initial={{ opacity: 0, x: tool.reverse ? 20 : -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="inline-block px-4 py-2 bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)] font-bold text-sm rounded-[50px] mb-6">
                    {tool.tag}
                  </span>
                  <h3 className="text-3xl md:text-4xl font-display font-extrabold text-[var(--color-text-primary)] mb-6 tracking-tight leading-tight">
                    {tool.title}
                  </h3>
                  <p className="text-lg text-[var(--color-text-secondary)] font-sans font-medium leading-relaxed mb-8">
                    {tool.description}
                  </p>
                  <Link 
                    href="/register" 
                    className="inline-flex items-center gap-2 text-[var(--color-accent-primary)] font-bold hover:opacity-80 transition-opacity"
                  >
                    Get started <span className="text-xl">→</span>
                  </Link>
                </motion.div>
              </div>
              
              <div className="flex-1 w-full">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className={`w-full rounded-[50px] p-8 md:p-12 ${tool.imageBg}`}
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
