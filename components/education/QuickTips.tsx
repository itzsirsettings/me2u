"use client";

import ContextualTip from "./ContextualTip";

interface QuickTipsProps {
  context:
    | "wallet"
    | "loans"
    | "marketplace"
    | "circles"
    | "profile"
    | "kyc"
    | "referrals";
}

const tipsConfig: Record<
  string,
  Array<{
    type: "info" | "success" | "warning" | "tip";
    title: string;
    message: string;
    learnMoreLink?: string;
  }>
> = {
  wallet: [
    {
      type: "tip",
      title: "Security Deposit Tip",
      message:
        "Keep 50% of your loan amount in your wallet. It's not deducted—it's your security deposit and stays yours.",
      learnMoreLink: "/education/borrowing-responsibly",
    },
    {
      type: "info",
      title: "Withdrawals Take Time",
      message:
        "Withdrawal requests are reviewed manually for security. Expect 1-2 business days for approval.",
    },
  ],
  loans: [
    {
      type: "success",
      title: "0% Interest Forever",
      message:
        "All loans on Me2U are completely interest-free. You only repay what you borrow.",
    },
    {
      type: "tip",
      title: "Repay Early, Build Trust",
      message:
        "Repaying your loan early boosts your trust score and unlocks higher loan amounts faster.",
      learnMoreLink: "/education/understanding-trust-scores",
    },
    {
      type: "warning",
      title: "One Active Loan at a Time",
      message:
        "You must repay your current loan before requesting another. Plan your borrowing accordingly.",
    },
  ],
  marketplace: [
    {
      type: "tip",
      title: "Check Trust Scores",
      message:
        "Review the trust score of borrowers and lenders before accepting requests. Higher scores indicate more reliable users.",
      learnMoreLink: "/education/understanding-trust-scores",
    },
    {
      type: "info",
      title: "Locked Balance Protection",
      message:
        "When you lend, your funds are locked until the borrower repays. This protects you from accidental spending.",
    },
  ],
  circles: [
    {
      type: "success",
      title: "Group Rewards Available",
      message:
        "Your circle can earn ₦100 per member for a perfect month of on-time repayments. Team up for rewards!",
      learnMoreLink: "/education/building-wealth-circles",
    },
    {
      type: "tip",
      title: "Invite Trusted Members",
      message:
        "Quality over quantity. Invite people you trust to maintain high on-time repayment rates and earn circle rewards.",
    },
  ],
  profile: [
    {
      type: "tip",
      title: "Complete Your Profile",
      message:
        "Verify your email, phone, and complete KYC to maximize your trust score and unlock full platform features.",
    },
    {
      type: "info",
      title: "Transaction PIN Security",
      message:
        "Your transaction PIN protects withdrawals and sensitive actions. Never share it with anyone, including support.",
      learnMoreLink: "/education/security-best-practices",
    },
  ],
  kyc: [
    {
      type: "warning",
      title: "KYC is Required",
      message:
        "Complete KYC verification to access loans, marketplace, and withdrawals. This protects all users from fraud.",
    },
    {
      type: "tip",
      title: "Upload Clear Documents",
      message:
        "Use good lighting and ensure all text is readable. Blurry photos delay approval.",
    },
  ],
  referrals: [
    {
      type: "success",
      title: "Earn ₦500 Per Active Referral",
      message:
        "You earn ₦250 when your referral makes their first withdrawal, and ₦250 when they complete their first loan repayment.",
      learnMoreLink: "/education/maximizing-referrals",
    },
    {
      type: "tip",
      title: "Help Them Succeed",
      message:
        "Guide your referrals through KYC and their first loan. Active referrals earn you more rewards.",
    },
  ],
};

export default function QuickTips({ context }: QuickTipsProps) {
  const tips = tipsConfig[context] || [];

  if (tips.length === 0) return null;

  return (
    <div className="space-y-3">
      {tips.map((tip, index) => (
        <ContextualTip
          key={index}
          type={tip.type}
          title={tip.title}
          message={tip.message}
          learnMoreLink={tip.learnMoreLink}
        />
      ))}
    </div>
  );
}
