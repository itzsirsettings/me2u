"use client";

import { motion } from "framer-motion";
import { FeatureHighlightCard } from "@/components/ui/feature-highlight-card";
import protectedWalletImage from "@/protected-wallet-me2u-transparent.png";
import protectedWalletDarkImage from "@/protected-wallet-me2u-transparent-dark.png";
import peerMarketplaceImage from "@/peer-marketplace-me2u-transparent.png";
import peerMarketplaceDarkImage from "@/peer-marketplace-me2u-transparent-dark.png";
import directLoansImage from "@/direct-loans-me2u-transparent.png";
import directLoansDarkImage from "@/direct-loans-me2u-transparent-dark.png";

const tools = [
  {
    id: "deposit",
    title: "Start with a protected wallet.",
    description:
      "Pay the fixed ₦1,000 deposit, upload your transfer reference and receipt, then complete KYC to unlock withdrawals and loan access.",
    imageSrc: protectedWalletImage.src,
    imageDarkSrc: protectedWalletDarkImage.src,
    imageAlt: "Receipts and calculator for protected wallet onboarding",
    imageVariant: "transparent" as const,
    buttonText: "Start onboarding",
  },
  {
    id: "marketplace",
    title: "Peer Marketplace.",
    description:
      "Borrowers and lenders meet in one shared market where listings stay interest-free, transparent, and tied to wallet balances and trust signals.",
    imageSrc: peerMarketplaceImage.src,
    imageDarkSrc: peerMarketplaceDarkImage.src,
    imageAlt: "People reviewing financial marketplace information",
    imageVariant: "transparent" as const,
    buttonText: "Explore marketplace",
  },
  {
    id: "direct-loans",
    title: "Access 0% loans directly or from matched peers.",
    description:
      "Use Me2U for direct loans and peer-funded loans with clear durations, wallet checks, repayment visibility, and 0% interest.",
    imageSrc: directLoansImage.src,
    imageDarkSrc: directLoansDarkImage.src,
    imageAlt: "Card payment and digital finance workflow",
    imageVariant: "transparent" as const,
    buttonText: "Request a loan",
  },
];

export default function AdvancedToolsSection() {
  return (
    <section className="bg-background py-32 md:py-40 overflow-hidden" id="loans">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mb-16 md:mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-medium text-foreground mb-8 tracking-tight leading-[1.2]"
          >
            A refined flow from <br/>
            <span className="text-green">deposit to withdrawal.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl"
          >
            Each step is built for repeat use: clear onboarding, visible marketplace rules, and 0% lending paths that keep trust signals close.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {tools.map((tool) => (
            <FeatureHighlightCard
              key={tool.id}
              id={tool.id}
              imageSrc={tool.imageSrc}
              imageDarkSrc={tool.imageDarkSrc}
              imageAlt={tool.imageAlt}
              imageVariant={tool.imageVariant}
              title={tool.title}
              description={tool.description}
              buttonText={tool.buttonText}
              buttonHref="/register"
              className="mx-auto"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
