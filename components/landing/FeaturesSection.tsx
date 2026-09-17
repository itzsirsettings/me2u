"use client";

import {
  FileCheck2,
  Gift,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Store,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { FeatureGrid } from "@/components/ui/feature-section";
import featuresDarkIllustration from "@/features-me2u-transparent-dark.png";
import featuresIllustration from "@/features-me2u-transparent.png";

const featureCategories = [
  {
    icon: <FileCheck2 size={24} />,
    title: "Join & Verify",
    items: [
      { text: "Simple onboarding with verified identity checks" },
      { text: "Secure account setup in minutes" },
      { text: "One-time refundable deposit to start", href: "/register" },
      { text: "Get 24/7 answers from the built-in Me2U Guide" },
    ],
  },
  {
    icon: <ShieldCheck size={24} />,
    title: "Trust Score",
    items: [
      { text: "Build a visible profile from repayments" },
      { text: "Wallet use and referrals boost your score" },
      { text: "Higher limits from verified behavior" },
    ],
  },
  {
    icon: <WalletCards size={24} />,
    title: "Smart Wallet",
    items: [
      { text: "Send, receive, and withdraw with ease" },
      { text: "Verified records for every transaction" },
      { text: "Payment links for daily use" },
    ],
  },
  {
    icon: <ReceiptText size={24} />,
    title: "Daily Bills",
    items: [
      { text: "Airtime, data, and cable TV" },
      { text: "Electricity and utilities" },
      { text: "School fees and everyday essentials" },
    ],
  },
  {
    icon: <PiggyBank size={24} />,
    title: "Savings Goals",
    items: [
      { text: "Emergency and rent goals" },
      { text: "School fees and family plans" },
      { text: "Business and group savings" },
    ],
  },
  {
    icon: <UsersRound size={24} />,
    title: "Trust Circles",
    items: [
      { text: "Private family and community groups" },
      { text: "Church, school, and trader circles" },
      { text: "Transparent lending with people you know" },
    ],
  },
  {
    icon: <Gift size={24} />,
    title: "Referral Rewards",
    items: [
      { text: "Invite friends you trust and earn rewards" },
      { text: "Unlock Bronze to Platinum credit levels" },
      { text: "Build your network, grow your score" },
    ],
  },
  {
    icon: <Store size={24} />,
    title: "Local Merchant Deals",
    items: [
      { text: "Verified food, pharmacy, and transport" },
      { text: "Exclusive discounts from trusted businesses" },
      { text: "Shopping deals and everyday savings" },
    ],
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-background py-24 md:py-32">
      <FeatureGrid
        title={
          <>
            Everything You Need for{" "}
            <span className="relative inline-block">
              Fair Finance
              <svg
                viewBox="0 0 200 6"
                className="absolute left-0 bottom-0 -mb-1 w-full"
                aria-hidden="true"
              >
                <path
                  d="M1 4.5C40 1.63 120 1.39 199 4.5"
                  stroke="var(--green)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </span>
          </>
        }
        subtitle="From verified wallets to savings goals, referral rewards to community circles—Me2U gives you the tools to build trust, save smart, and access 0% interest loans."
        illustrationSrc={featuresIllustration.src}
        illustrationDarkSrc={featuresDarkIllustration.src}
        illustrationAlt="Me2U platform features showing verified accounts and community lending"
        categories={featureCategories}
        buttonText="Create Free Account"
        buttonHref="/register"
      />
    </section>
  );
}
