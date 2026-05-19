"use client";

import Link from "next/link";
import { companyInfo, legalFooterGroups } from "@/lib/legal-content";

export default function LandingFooter() {
  return (
    <footer className="bg-[var(--color-bg-secondary)] pt-20 pb-10 border-t border-[var(--color-border)] text-[var(--color-text-primary)]">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
          
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-2 mb-6 group">
              <div className="w-10 h-10 rounded-[50px] bg-[var(--color-accent-primary)] flex items-center justify-center text-[var(--color-on-accent)] font-bold text-xl group-hover:opacity-90 transition-opacity">
                M
              </div>
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-xl leading-tight text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                  Me2U
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-secondary)]">
                  by {companyInfo.tradingName}
                </span>
              </div>
            </Link>
            
            <p className="text-[var(--color-text-secondary)] font-medium mb-6 leading-relaxed max-w-sm">
              Secure peer-to-peer lending with verified wallets, KYC, referrals, repayments, and protected withdrawals.
            </p>
            
            <p className="text-sm font-bold text-[var(--color-text-secondary)] opacity-80">
              Legally owned by {companyInfo.legalName}.
            </p>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {legalFooterGroups.map((group, idx) => (
              <div key={idx}>
                <h3 className="font-bold text-[var(--color-text-primary)] mb-6">{group.title}</h3>
                <ul className="space-y-4">
                  {group.links.map((link, linkIdx) => (
                    <li key={linkIdx}>
                      <Link 
                        href={link.href}
                        className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] font-medium transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            
            <div>
              <h3 className="font-bold text-[var(--color-text-primary)] mb-6">Contact</h3>
              <ul className="space-y-4">
                <li>
                  <a href={`mailto:${companyInfo.email}`} className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] font-medium transition-colors">
                    {companyInfo.email}
                  </a>
                </li>
                {companyInfo.phones.map((phone, pIdx) => (
                  <li key={pIdx}>
                    <a href={`tel:${phone.replace(/\s+/g, '')}`} className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] font-medium transition-colors block">
                      {phone}
                    </a>
                  </li>
                ))}
                <li className="text-[var(--color-text-secondary)] font-medium pt-2">
                  Nigeria
                </li>
              </ul>
            </div>
          </div>
          
        </div>

        <div className="border-t border-[var(--color-border)] pt-8 pb-8">
          <p className="text-sm text-[var(--color-text-secondary)] font-medium leading-relaxed opacity-80">
            Me2U is a peer-to-peer lending and wallet technology platform. Loan access, welcome bonuses, withdrawals, referrals, wallet activity, and marketplace features are subject to registration, deposit confirmation, KYC, fraud checks, admin review, wallet rules, and approval. Loans require repayment. Terms apply.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-bold text-[var(--color-text-secondary)] opacity-80">
            ©{new Date().getFullYear()} Me2U by {companyInfo.tradingName}
          </p>
          <Link href="/legal/cookie-policy" className="text-sm font-bold text-[var(--color-accent-primary)] hover:underline transition-all">
            Review Cookie Policy
          </Link>
        </div>
        
      </div>
    </footer>
  );
}
