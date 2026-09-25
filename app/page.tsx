import type { Metadata } from "next";

import AdvancedToolsSection from "@/components/landing/AdvancedToolsSection";
import CommunityCirclesSection from "@/components/landing/CommunityCirclesSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import FAQSection from "@/components/landing/FAQSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingHeader from "@/components/landing/LandingHeader";
import PublicProofSection from "@/components/landing/PublicProofSection";
import TrustScoreSection from "@/components/landing/TrustScoreSection";

export const metadata: Metadata = {
  title: "Me2U — Interest-Free Borrowing Built on Verified Trust",
  description:
    "Me2U helps Nigerians verify their identity, build a Trust Score, access interest-free borrowing, join peer and community lending, save towards goals, and earn referral rewards.",
  alternates: {
    canonical: "https://www.me2ulend.online",
  },
  openGraph: {
    url: "https://www.me2ulend.online",
  },
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background selection:bg-green/30 font-sans text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Me2U",
              url: "https://www.me2ulend.online",
              logo: "https://www.me2ulend.online/me2u_logo_v2.svg",
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Me2U",
              url: "https://www.me2ulend.online",
            },
          ]),
        }}
      />
      <LandingHeader />

      <main id="main-content">
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <TrustScoreSection />
        <AdvancedToolsSection />
        <CommunityCirclesSection />
        <PublicProofSection />
        <ComparisonSection />
        <FAQSection />
        <LandingCTA />
      </main>

      <LandingFooter />
    </div>
  );
}
