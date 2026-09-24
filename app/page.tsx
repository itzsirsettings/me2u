import type { Metadata } from "next";
import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TrustScoreSection from "@/components/landing/TrustScoreSection";
import AdvancedToolsSection from "@/components/landing/AdvancedToolsSection";
import CommunityCirclesSection from "@/components/landing/CommunityCirclesSection";
import PublicProofSection from "@/components/landing/PublicProofSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import FAQSection from "@/components/landing/FAQSection";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Me2U — Interest-Free Borrowing Built on Verified Trust",
  description:
    "Me2U helps Nigerians verify their identity, build a Trust Score, access interest-free borrowing, join peer and community lending, save towards goals, and earn referral rewards.",
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background selection:bg-green/30 font-sans text-foreground">
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
