"use client";

import Link from "next/link";
import { companyInfo, legalFooterGroups } from "@/lib/legal-content";

function isExternal(href: string) {
  return href.startsWith("mailto:") || href.startsWith("tel:");
}

export default function LandingFooter() {
  return (
    <footer className="bg-navy pt-32 pb-20 border-t border-white/5">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 mb-24">
          
          <div className="lg:col-span-5">
            <Link href="/" className="flex items-center gap-4 mb-10 group">
              <div className="w-12 h-12 bg-green rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                <span className="text-navy font-black text-2xl">M</span>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-white/40">
                  {companyInfo.legalName}
                </span>
                <span className="text-xl font-medium text-white tracking-tight">Me2<span className="text-green">U</span></span>
              </div>
            </Link>
            
            <p className="text-lg text-white/60 font-normal mb-10 leading-relaxed max-w-md tracking-tight">
              The premium standard for interest-free peer lending and cooperative financial growth.
            </p>
            
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">{companyInfo.address}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-12">
            {legalFooterGroups.map((group, idx) => (
              <div key={idx}>
                <h3 className="text-xs font-medium text-white uppercase tracking-[0.2em] mb-8">{group.title}</h3>
                <ul className="space-y-5">
                  {group.links.map((link, linkIdx) => (
                    <li key={linkIdx}>
                      {isExternal(link.href) ? (
                        <a href={link.href} className="text-sm text-white/40 hover:text-green font-normal transition-all duration-300 flex items-center gap-2 group">
                          <span className="w-0 h-px bg-green group-hover:w-3 transition-all" />
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-white/40 hover:text-green font-normal transition-all duration-300 flex items-center gap-2 group"
                        >
                          <span className="w-0 h-px bg-green group-hover:w-3 transition-all" />
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

        <div className="border-t border-white/5 pt-12 mb-12">
          <p className="text-[12px] text-white/30 font-normal leading-relaxed max-w-5xl uppercase tracking-wider">
            Me2U is a peer-to-peer lending, wallet, and cooperative group platform. Loan access, withdrawals, referrals, wallet activity, and marketplace features are subject to registration, deposit confirmation, KYC, fraud checks, admin review, wallet rules, and approval. External airtime/data/electricity/remittance and app-store integrations require partner credentials and compliance validation. Loans require repayment. Terms apply.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-white tracking-tight">
              ©{new Date().getFullYear()} Me2U
            </p>
            <div className="h-1 w-1 rounded-full bg-white/10" />
            <span className="text-sm font-normal text-white/40">All rights reserved.</span>
          </div>
          <Link href="/legal/cookie-policy" className="text-xs font-medium text-white uppercase tracking-widest hover:text-green transition-colors border-b border-white/5 hover:border-green/20 pb-1">
            Cookie Policy
          </Link>
        </div>
        
      </div>
    </footer>
  );
}
