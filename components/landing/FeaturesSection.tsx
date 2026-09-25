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
      { text: "Email verification, identity checks, and onboarding review" },
      {
        text: "Registration deposit required to activate your account",
        href: "https://app.me2ulend.online/register",
      },
      { text: "Get 24/7 answers from the built-in Me2U Guide" },
    ],
  },
  {
    icon: <ShieldCheck size={24} />,
    title: "Trust Score",
    items: [
      { text: "Build a visible profile from repayments" },
      { text: "Wallet use and referrals boost your score" },
      { text: "Progress through verified behavior and repayment history" },
    ],
  },
  {
    icon: <WalletCards size={24} />,
    title: "Smart Wallet",
    items: [
      { text: "Send, receive, fund, and withdraw from one wallet" },
      { text: "Verified records for every transaction" },
      { text: "Payment links for daily use" },
    ],
  },
  {
    icon: <ReceiptText size={24} />,
    title: "Daily Bills",
    items: [
      { text: "Keep everyday payments and money movement in one place" },
      { text: "Track transactions with clear records" },
      { text: "Bills access is routed through the account experience" },
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
      { text: "You earn ₦1,500 when a referred friend signs up; they receive ₦500" },
      {
        text: "Earn another ₦250 after their first withdrawal and ₦250 after their first repayment",
      },
      {
        text: "Potential total: ₦2,500 across stages, subject to onboarding and verification rules",
      },
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
        subtitle="From verified wallets and savings goals to peer lending, community circles, and referral rewards, Me2U gives you a clearer path from onboarding to responsible borrowing."
        illustrationSrc={featuresIllustration.src}
        illustrationDarkSrc={featuresDarkIllustration.src}
        illustrationAlt="Me2U platform features showing verified accounts and community lending"
        categories={featureCategories}
        buttonText="Create Free Account"
        buttonHref="https://app.me2ulend.online/register"
      />
    </section>
  );
}
