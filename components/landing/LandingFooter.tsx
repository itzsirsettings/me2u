"use client";

import Link from "next/link";
import { companyInfo, legalFooterGroups } from "@/lib/legal-content";

function isExternal(href: string) {
  return href.startsWith("mailto:") || href.startsWith("tel:");
}

export default function LandingFooter() {
  return (
    <footer className="bg-white pt-32 pb-20 border-t border-slate-100">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 mb-24">
          
          <div className="lg:col-span-5">
            <Link href="/" className="flex items-center gap-4 mb-10 group">
              <img
                src="/me2u_nav_logo.svg"
                alt="Me2U"
                className="h-16 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
              />
              <div className="h-10 w-px bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">
                  {companyInfo.legalName}
                </span>
              </div>
            </Link>
            
            <p className="text-xl text-slate-500 font-medium mb-10 leading-relaxed max-w-md tracking-tight">
              The premium standard for interest-free peer lending and cooperative financial growth.
            </p>
            
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">{companyInfo.address}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-12">
            {legalFooterGroups.map((group, idx) => (
              <div key={idx}>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8">{group.title}</h3>
                <ul className="space-y-5">
                  {group.links.map((link, linkIdx) => (
                    <li key={linkIdx}>
                      {isExternal(link.href) ? (
                        <a href={link.href} className="text-sm text-slate-500 hover:text-emerald-500 font-bold transition-all duration-300 flex items-center gap-2 group">
                          <span className="w-0 h-px bg-emerald-500 group-hover:w-3 transition-all" />
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-slate-500 hover:text-emerald-500 font-bold transition-all duration-300 flex items-center gap-2 group"
                        >
                          <span className="w-0 h-px bg-emerald-500 group-hover:w-3 transition-all" />
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
        </div>

        <div className="border-t border-slate-100 pt-12 mb-12">
          <p className="text-[12px] text-slate-400 font-medium leading-relaxed max-w-5xl uppercase tracking-wider opacity-70">
            Me2U is a peer-to-peer lending, wallet, and cooperative group platform. Loan access, welcome bonuses, withdrawals, referrals, wallet activity, and marketplace features are subject to registration, deposit confirmation, KYC, fraud checks, admin review, wallet rules, and approval. External airtime/data/electricity/remittance and app-store integrations require partner credentials and compliance validation. Loans require repayment. Terms apply.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <p className="text-sm font-black text-slate-900 tracking-tight">
              ©{new Date().getFullYear()} Me2U
            </p>
            <div className="h-1 w-1 rounded-full bg-slate-200" />
            <span className="text-sm font-bold text-slate-400">All rights reserved.</span>
          </div>
          <Link href="/legal/cookie-policy" className="text-xs font-black text-slate-900 uppercase tracking-widest hover:text-emerald-500 transition-colors border-b-2 border-slate-100 hover:border-emerald-100 pb-1">
            Cookie Policy
          </Link>
        </div>
        
      </div>
    </footer>
  );
}
