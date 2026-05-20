"use client";

import Link from "next/link";
import { companyInfo, legalFooterGroups } from "@/lib/legal-content";

function isExternal(href: string) {
  return href.startsWith("mailto:") || href.startsWith("tel:");
}

export default function LandingFooter() {
  return (
    <footer className="bg-slate-50 pt-20 pb-10 border-t border-slate-200">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
          
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-2 mb-6 group">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl group-hover:bg-blue-700 transition-colors">
                M
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl leading-tight text-slate-900">
                  Me2U
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500">
                  by {companyInfo.legalName}
                </span>
              </div>
            </Link>
            
            <p className="text-slate-600 font-medium mb-6 leading-relaxed max-w-sm">
              Secure peer-to-peer lending with verified wallets, KYC, referrals, repayments, and protected withdrawals.
            </p>
            
            <p className="text-sm font-bold text-slate-400">
              Legally owned by {companyInfo.legalName}.
            </p>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {legalFooterGroups.map((group, idx) => (
              <div key={idx}>
                <h3 className="font-bold text-slate-900 mb-6">{group.title}</h3>
                <ul className="space-y-4">
                  {group.links.map((link, linkIdx) => (
                    <li key={linkIdx}>
                      {isExternal(link.href) ? (
                        <a href={link.href} className="text-slate-500 hover:text-blue-600 font-medium transition-colors">
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-slate-500 hover:text-blue-600 font-medium transition-colors"
                        >
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

        <div className="border-t border-slate-200 pt-8 pb-8">
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Me2U is a peer-to-peer lending and wallet technology platform. Loan access, welcome bonuses, withdrawals, referrals, wallet activity, and marketplace features are subject to registration, deposit confirmation, KYC, fraud checks, admin review, wallet rules, and approval. Loans require repayment. Terms apply.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-bold text-slate-400">
            ©{new Date().getFullYear()} Me2U by {companyInfo.legalName}
          </p>
          <Link href="/legal/cookie-policy" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
            Review Cookie Policy
          </Link>
        </div>
        
      </div>
    </footer>
  );
}
