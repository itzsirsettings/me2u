"use client";

import { motion } from "framer-motion";

import { FeatureHighlightCard } from "@/components/ui/feature-highlight-card";
import directLoansDarkImage from "@/direct-loans-me2u-transparent-dark.png";
import directLoansImage from "@/direct-loans-me2u-transparent.png";
import peerMarketplaceDarkImage from "@/peer-marketplace-me2u-transparent-dark.png";
import peerMarketplaceImage from "@/peer-marketplace-me2u-transparent.png";
import protectedWalletDarkImage from "@/protected-wallet-me2u-transparent-dark.png";
import protectedWalletImage from "@/protected-wallet-me2u-transparent.png";

const tools = [
  {
    id: "wallet",
    title: "Your wallet, verified and protected.",
    description:
      "Fund, send, receive, and withdraw from a verified wallet. Every transaction is recorded, giving you a clearer financial history as you use the platform.",
    imageSrc: protectedWalletImage.src,
    imageDarkSrc: protectedWalletDarkImage.src,
    imageAlt: "Secure digital wallet with verified transaction records",
    imageVariant: "transparent" as const,
    buttonText: "Create account",
  },
  {
    id: "marketplace",
    title: "Lend or borrow with people you can see.",
    description:
      "Review borrow requests, lending offers, agreements, repayment progress, and dispute evidence in one peer marketplace.",
    imageSrc: peerMarketplaceImage.src,
    imageDarkSrc: peerMarketplaceDarkImage.src,
    imageAlt: "Peer-to-peer marketplace connecting borrowers and lenders",
    imageVariant: "transparent" as const,
    buttonText: "Explore marketplace",
  },
  {
    id: "loans",
    title: "Access direct, interest-free loans with clear durations.",
    description:
      "Explore interest-free borrowing options with clear durations and repayment schedules. Eligibility, retained balances, and available limits depend on your account tier.",
    imageSrc: directLoansImage.src,
    imageDarkSrc: directLoansDarkImage.src,
    imageAlt: "Zero-interest loan interface showing repayment schedule",
    imageVariant: "transparent" as const,
    buttonText: "View loan options",
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
            className="landing-h2 mb-8"
          >
            Built for Trust, <br />
            <span className="landing-accent-word">Designed for Transparency.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="landing-body max-w-2xl"
          >
            From verified wallets to peer lending, every feature is designed to make your money
            decisions easier to understand. Review applicable charges, eligibility, and
            repayment terms before you confirm an action.
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
              buttonHref="https://app.me2ulend.online/register"
              className="mx-auto"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
