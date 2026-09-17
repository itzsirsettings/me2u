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
  title: "Me2U — 0% Interest Loans. Built on Trust. For Every Nigerian.",
  description:
    "Nigeria's trust-based peer lending platform. Access 0% interest loans, build your Trust Score, join community circles, and save towards goals. No hidden fees, transparent scoring, verified identity. Built for Nigeria and the Diaspora.",
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
