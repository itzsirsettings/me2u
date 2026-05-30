"use client";

import {
  FileCheck2,
  Gift,
  Globe2,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Store,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { FeatureGrid } from "@/components/ui/feature-section";
import featuresIllustration from "@/features-me2u-transparent.png";
import featuresDarkIllustration from "@/features-me2u-transparent-dark.png";

const featureCategories = [
  {
    icon: <FileCheck2 size={24} />,
    title: "Onboarding",
    items: [
      { text: "₦1,000 registration deposit" },
      { text: "Receipt and transfer reference upload" },
      { text: "KYC guidance for verified accounts", href: "/register" },
    ],
  },
  {
    icon: <ShieldCheck size={24} />,
    title: "Trust score",
    items: [
      { text: "Repayment history tracking" },
      { text: "Wallet activity signals" },
      { text: "Higher limits from verified behavior" },
    ],
  },
  {
    icon: <WalletCards size={24} />,
    title: "Wallet",
    items: [
      { text: "Receive and withdraw money" },
      { text: "Verified wallet records" },
      { text: "Payment links for daily use" },
    ],
  },
  {
    icon: <ReceiptText size={24} />,
    title: "Bills",
    items: [
      { text: "Airtime and data" },
      { text: "Electricity and cable TV" },
      { text: "School fees and utilities" },
    ],
  },
  {
    icon: <PiggyBank size={24} />,
    title: "Savings",
    items: [
      { text: "Emergency goals" },
      { text: "Rent and school fee goals" },
      { text: "Business and group savings" },
    ],
  },
  {
    icon: <UsersRound size={24} />,
    title: "Circles",
    items: [
      { text: "Private family lending groups" },
      { text: "School, church, and trader circles" },
      { text: "Agreement summaries and receipts" },
    ],
  },
  {
    icon: <Gift size={24} />,
    title: "Rewards",
    items: [
      { text: "Referral reward tracking" },
      { text: "₦500 after qualifying repayment" },
      { text: "Verified invite quality signals" },
    ],
  },
  {
    icon: <Store size={24} />,
    title: "Marketplace",
    items: [
      { text: "Top merchant deals" },
      { text: "Food, pharmacy, and transport offers" },
      { text: "Verified local business listings" },
    ],
  },
  {
    icon: <Globe2 size={24} />,
    title: "Global profile",
    items: [
      { text: "Country and currency preferences" },
      { text: "Language-ready account profile" },
      { text: "Country-gated lending setup" },
    ],
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-background py-24 md:py-32">
      <FeatureGrid
        title={
          <>
            Everything builds{" "}
            <span className="relative inline-block">
              trust
              <svg
                viewBox="0 0 120 6"
                className="absolute left-0 bottom-0 -mb-1 w-full"
                aria-hidden="true"
              >
                <path
                  d="M1 4.5C25.46 1.63 78.43 1.39 119 4.5"
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
        subtitle="Me2U turns onboarding, wallet activity, KYC, referrals, savings, and repayments into a transparent profile before you borrow."
        illustrationSrc={featuresIllustration.src}
        illustrationDarkSrc={featuresDarkIllustration.src}
        illustrationAlt="Me2U feature illustration showing verified forms and account activity"
        categories={featureCategories}
        buttonText="Open account"
        buttonHref="/register"
      />
    </section>
  );
}
