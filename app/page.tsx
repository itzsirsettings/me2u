import type { Metadata } from "next";
import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import AdvancedToolsSection from "@/components/landing/AdvancedToolsSection";
import PublicProofSection from "@/components/landing/PublicProofSection";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Me2U - Trust-Based Interest-Free Peer Lending",
  description:
    "Me2U is a secure peer-to-peer lending app built for individuals and cooperatives, with trust scores, credit builder tools, verified wallets, KYC, marketplace lending, savings goals, daily wallet services, and referral rewards.",
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background selection:bg-green/30 font-sans text-foreground">
      <LandingHeader />
      
      <main>
        <HeroSection />
        <FeaturesSection />
        <AdvancedToolsSection />
        <PublicProofSection />
        <LandingCTA />
      </main>
      
      <LandingFooter />
    </div>
  );
}
