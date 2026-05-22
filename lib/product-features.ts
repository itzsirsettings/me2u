type CountryConfig = {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  primaryLanguage: string;
  lendingStatus: "active" | "readiness";
  kycSummary: string;
};

type LanguageOption = {
  code: string;
  name: string;
};

type TrustUserLike = {
  trustScore?: number;
  kycVerified?: boolean;
  registrationDepositPaid?: boolean;
  welcomeBonusUnlockedAt?: string | null;
  affiliateEarnings?: number;
  verifiedReferralCount?: number;
  weeklyVerifiedReferralCount?: number;
  email?: string | null;
  phone?: string | null;
  createdAt?: string | null;
};

type TrustTransactionLike = {
  type: string;
  date?: string;
};

type TrustLoanLike = {
  status: "active" | "completed";
  role?: "borrower" | "lender";
};

type ReferralUserLike = {
  verifiedReferralCount?: number;
  weeklyVerifiedReferralCount?: number;
  affiliateEarnings?: number;
};

export const globalCountryOptions: CountryConfig[] = [
  {
    code: "NG",
    name: "Nigeria",
    currency: "NGN",
    currencySymbol: "₦",
    locale: "en-NG",
    primaryLanguage: "English",
    lendingStatus: "active",
    kycSummary: "Bank details, phone, email, ID checks, and passport photo.",
  },
  {
    code: "GH",
    name: "Ghana",
    currency: "GHS",
    currencySymbol: "GH₵",
    locale: "en-GH",
    primaryLanguage: "English",
    lendingStatus: "readiness",
    kycSummary: "Country KYC rules and payment rails must be enabled first.",
  },
  {
    code: "KE",
    name: "Kenya",
    currency: "KES",
    currencySymbol: "KSh",
    locale: "en-KE",
    primaryLanguage: "Swahili",
    lendingStatus: "readiness",
    kycSummary: "Country KYC rules and payment rails must be enabled first.",
  },
  {
    code: "ZA",
    name: "South Africa",
    currency: "ZAR",
    currencySymbol: "R",
    locale: "en-ZA",
    primaryLanguage: "English",
    lendingStatus: "readiness",
    kycSummary: "Country KYC rules and payment rails must be enabled first.",
  },
  {
    code: "GB",
    name: "UK",
    currency: "GBP",
    currencySymbol: "£",
    locale: "en-GB",
    primaryLanguage: "English",
    lendingStatus: "readiness",
    kycSummary: "Country KYC rules and payment rails must be enabled first.",
  },
  {
    code: "US",
    name: "US",
    currency: "USD",
    currencySymbol: "$",
    locale: "en-US",
    primaryLanguage: "English",
    lendingStatus: "readiness",
    kycSummary: "Country KYC rules and payment rails must be enabled first.",
  },
  {
    code: "CA",
    name: "Canada",
    currency: "CAD",
    currencySymbol: "C$",
    locale: "en-CA",
    primaryLanguage: "English",
    lendingStatus: "readiness",
    kycSummary: "Country KYC rules and payment rails must be enabled first.",
  },
  {
    code: "AE",
    name: "UAE",
    currency: "AED",
    currencySymbol: "د.إ",
    locale: "en-AE",
    primaryLanguage: "Arabic",
    lendingStatus: "readiness",
    kycSummary: "Country KYC rules and payment rails must be enabled first.",
  },
];

export const languageOptions: LanguageOption[] = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "sw", name: "Swahili" },
  { code: "ar", name: "Arabic" },
  { code: "pt", name: "Portuguese" },
];

export const growthFeatureModules = [
  {
    title: "Me2U Trust Score",
    body: "Build a visible score from KYC, repayments, wallet activity, referrals, account age, and dispute-free lending.",
    status: "Live signal",
  },
  {
    title: "Credit Builder",
    body: "Repayment badges, monthly reports, trust levels, and higher-limit eligibility make good behavior visible.",
    status: "In app",
  },
  {
    title: "Global Profile",
    body: "Country, currency, language, local terms, and local KYC readiness prepare Me2U for gradual expansion.",
    status: "Onboarding",
  },
  {
    title: "Diaspora Support",
    body: "Sponsor wallets, verified beneficiaries, purpose-based support, and spending proof help families support each other safely.",
    status: "Readiness",
  },
  {
    title: "Me2U Circles",
    body: "Private family, school, church, trader, and business circles can grow lending through trusted communities.",
    status: "Growth engine",
  },
  {
    title: "Protected Peer Lending",
    body: "Agreement summaries, locked funding records, repayment reminders, disputes, evidence uploads, and receipts reduce uncertainty.",
    status: "Protection",
  },
  {
    title: "Bills and Utilities",
    body: "Airtime, data, electricity, cable TV, internet, school fees, QR payments, and payment links keep wallets active.",
    status: "Daily use",
  },
  {
    title: "Savings Goals",
    body: "Emergency wallets, locked savings, rent, school fees, business capital, group savings, and small challenges build discipline.",
    status: "Wellness",
  },
  {
    title: "Merchant Deals",
    body: "Verified food, pharmacy, school, transport, phone, supermarket, printing, online store, and training deals reward wallet users.",
    status: "Rewards",
  },
  {
    title: "Gamified Referrals",
    body: "Leaderboards, weekly referrer rewards, ambassador badges, invite milestones, and Bronze-to-Gold progress make sharing Me2U visible.",
    status: "Viral growth",
  },
  {
    title: "Financial Education",
    body: "Short lessons help users understand peer lending, scam prevention, repayment, money habits, wallet safety, and borrowing mistakes.",
    status: "Responsible use",
  },
  {
    title: "Visible Security",
    body: "Security center, PINs, device alerts, biometrics, freeze wallet, recovery, and fraud reporting help users see protection in action.",
    status: "Trust",
  },
] as const;

export const referralProgramLevels = [
  {
    name: "Starter",
    requirement: 1,
    reward: "₦500",
    badge: "Bronze",
    summary: "1 verified referral with repayment",
  },
  {
    name: "Builder",
    requirement: 5,
    reward: "Bonus badge + extra reward",
    badge: "Silver",
    summary: "5 verified referrals with repayment",
  },
  {
    name: "Ambassador",
    requirement: 20,
    reward: "Higher reward + leaderboard",
    badge: "Gold",
    summary: "20 verified referrals with repayment",
  },
  {
    name: "Partner",
    requirement: 100,
    reward: "Commission plan",
    badge: "Platinum",
    summary: "100 verified referrals with repayment",
  },
] as const;

export const financialEducationLessons = [
  {
    title: "How peer lending works",
    duration: "3 min",
    outcome: "Understand borrower, lender, marketplace, and repayment roles before accepting money.",
  },
  {
    title: "How to avoid loan scams",
    duration: "4 min",
    outcome: "Spot fake agents, off-app pressure, advance-fee tricks, and suspicious links.",
  },
  {
    title: "How to repay on time",
    duration: "3 min",
    outcome: "Use reminders, due dates, wallet funding, and smaller commitments to protect your trust score.",
  },
  {
    title: "How to build trust score",
    duration: "4 min",
    outcome: "Improve KYC, wallet activity, referrals, repayment history, account age, and community ratings.",
  },
  {
    title: "How to manage money",
    duration: "5 min",
    outcome: "Plan cash flow, separate needs from wants, and avoid borrowing for avoidable expenses.",
  },
  {
    title: "How to save for emergencies",
    duration: "3 min",
    outcome: "Build a small emergency wallet before relying on loans.",
  },
  {
    title: "How to protect your wallet",
    duration: "4 min",
    outcome: "Use PINs, device checks, recovery steps, and fraud reporting when something feels wrong.",
  },
  {
    title: "Borrowing mistakes to avoid",
    duration: "4 min",
    outcome: "Avoid hidden side agreements, over-borrowing, missed deadlines, and sharing login details.",
  },
] as const;

export const visibleSecurityFeatures = [
  { title: "Two-factor authentication", detail: "Add a second check before sensitive account access.", icon: "key" },
  { title: "Device login alerts", detail: "Notify users when a new device signs in.", icon: "bell" },
  { title: "Biometric login", detail: "Let supported phones unlock the app with face or fingerprint.", icon: "fingerprint" },
  { title: "Withdrawal PIN", detail: "Require a PIN before money leaves the wallet.", icon: "lock" },
  { title: "Transaction PIN", detail: "Confirm funding, repayment, and lending actions with a PIN.", icon: "shield" },
  { title: "Trusted devices", detail: "Let users review and remove saved devices.", icon: "mobile" },
  { title: "Suspicious login warning", detail: "Show clear warnings when login behavior looks unusual.", icon: "alert" },
  { title: "Freeze wallet", detail: "Pause outgoing wallet activity while support reviews an issue.", icon: "freeze" },
  { title: "Session history", detail: "Show recent account sessions without exposing private device data.", icon: "receipt" },
  { title: "Account recovery", detail: "Guide verified users through safe recovery when access is lost.", icon: "profile" },
  { title: "Fraud report", detail: "Give users a fast route to report suspicious activity.", icon: "security" },
] as const;

export const mobileAppReadiness = [
  { title: "Progressive Web App", status: "Install button ready", detail: "Users can install the web app where browser support is available." },
  { title: "Push notifications", status: "Planned", detail: "Repayment reminders, login alerts, and referral milestones should become push-ready." },
  { title: "Android app", status: "Store-ready target", detail: "Play Store listing, screenshots, reviews, and release checks should be prepared before launch." },
  { title: "iPhone app", status: "Store-ready target", detail: "App Store presence should follow the same trust, security, and compliance posture." },
] as const;

export function getCountryConfig(code?: string | null) {
  return globalCountryOptions.find((country) => country.code === code) || globalCountryOptions[0];
}

export function isSupportedCountryCode(code: string) {
  return globalCountryOptions.some((country) => country.code === code);
}

export function isSupportedLanguageCode(code: string) {
  return languageOptions.some((language) => language.code === code);
}

export function formatCountryMoney(amount: number, countryCode?: string | null) {
  const country = getCountryConfig(countryCode);

  return new Intl.NumberFormat(country.locale, {
    style: "currency",
    currency: country.currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

export function getReferralProgramProgress(user: ReferralUserLike | null | undefined) {
  const verifiedReferralCount = Math.max(0, Number(user?.verifiedReferralCount || 0));
  const weeklyVerifiedReferralCount = Math.max(0, Number(user?.weeklyVerifiedReferralCount || 0));
  const unlockedLevels = referralProgramLevels.filter((level) => verifiedReferralCount >= level.requirement);
  const currentLevel = unlockedLevels.at(-1) || null;
  const nextLevel = referralProgramLevels.find((level) => verifiedReferralCount < level.requirement) || null;
  const previousRequirement = currentLevel?.requirement || 0;
  const nextRequirement = nextLevel?.requirement || referralProgramLevels.at(-1)?.requirement || 100;
  const progressRange = Math.max(1, nextRequirement - previousRequirement);
  const nextProgressPercent = nextLevel
    ? Math.min(100, Math.max(0, Math.round(((verifiedReferralCount - previousRequirement) / progressRange) * 100)))
    : 100;

  return {
    verifiedReferralCount,
    weeklyVerifiedReferralCount,
    currentLevel,
    nextLevel,
    nextProgressPercent,
    inviteFiveProgress: Math.min(5, verifiedReferralCount),
    inviteFiveUnlocked: verifiedReferralCount >= 5,
    totalEarned: Number(user?.affiliateEarnings || 0),
  };
}

export function getCreditLevel(score = 0) {
  if (score >= 90) {
    return { name: "Platinum", next: "Max trust level", minimum: 90, color: "text-[var(--color-accent-primary)]" };
  }

  if (score >= 75) {
    return { name: "Gold", next: "Platinum at 90", minimum: 75, color: "text-[var(--color-warning-text)]" };
  }

  if (score >= 60) {
    return { name: "Silver", next: "Gold at 75", minimum: 60, color: "text-[var(--color-text-primary)]" };
  }

  return { name: "Bronze", next: "Silver at 60", minimum: 0, color: "text-[var(--color-text-secondary)]" };
}

export function getTrustScoreBreakdown(
  user: TrustUserLike | null | undefined,
  transactions: TrustTransactionLike[] = [],
  loans: TrustLoanLike[] = [],
) {
  const completedLoans = loans.filter((loan) => loan.status === "completed").length;
  const activeLoans = loans.filter((loan) => loan.status === "active").length;
  const walletActivity = transactions.length;
  const ageDays = user?.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86_400_000))
    : 0;
  const verifiedContacts = [user?.email, user?.phone, user?.kycVerified ? "id" : ""].filter(Boolean).length;

  return [
    {
      label: "Completed KYC",
      earned: user?.kycVerified ? 18 : user?.registrationDepositPaid ? 8 : 0,
      weight: 18,
      detail: user?.kycVerified ? "Identity approved" : "KYC unlocks stronger trust",
    },
    {
      label: "Repayment history",
      earned: completedLoans > 0 ? 18 : activeLoans > 0 ? 9 : 0,
      weight: 18,
      detail: completedLoans > 0 ? `${completedLoans} completed` : activeLoans > 0 ? "Loan in progress" : "No repayments yet",
    },
    {
      label: "Wallet activity",
      earned: walletActivity >= 5 ? 12 : walletActivity > 0 ? 7 : 0,
      weight: 12,
      detail: walletActivity > 0 ? `${walletActivity} wallet records` : "Fund or repay to build history",
    },
    {
      label: "Referral quality",
      earned: Number(user?.verifiedReferralCount || 0) >= 5 ? 10 : Number(user?.affiliateEarnings || 0) > 0 ? 7 : 0,
      weight: 10,
      detail:
        Number(user?.verifiedReferralCount || 0) > 0
          ? `${Number(user?.verifiedReferralCount || 0)} verified referrals`
          : "Invite verified users",
    },
    {
      label: "Successful loans",
      earned: completedLoans >= 3 ? 12 : completedLoans > 0 ? 8 : activeLoans > 0 ? 4 : 0,
      weight: 12,
      detail: completedLoans > 0 ? "Loan behavior recorded" : "Complete loans to improve",
    },
    {
      label: "Dispute-free activity",
      earned: 10,
      weight: 10,
      detail: "No disputes recorded",
    },
    {
      label: "Account age",
      earned: ageDays >= 90 ? 8 : ageDays >= 30 ? 5 : ageDays > 0 ? 2 : 0,
      weight: 8,
      detail: ageDays > 0 ? `${ageDays} days active` : "New profile",
    },
    {
      label: "Verified contacts",
      earned: verifiedContacts >= 3 ? 7 : verifiedContacts >= 2 ? 5 : verifiedContacts > 0 ? 2 : 0,
      weight: 7,
      detail: `${verifiedContacts}/3 signals`,
    },
    {
      label: "Community rating",
      earned: completedLoans > 0 ? 5 : 0,
      weight: 5,
      detail: completedLoans > 0 ? "Post-loan rating ready" : "Starts after completed lending",
    },
  ];
}

export function getCreditBuilderBadges(
  user: TrustUserLike | null | undefined,
  transactions: TrustTransactionLike[] = [],
  loans: TrustLoanLike[] = [],
) {
  const completedLoans = loans.filter((loan) => loan.status === "completed").length;
  const score = Number(user?.trustScore || 0);

  return [
    {
      label: "Repayment badge",
      value: completedLoans > 0 ? "Earned" : "Pending",
      active: completedLoans > 0,
    },
    {
      label: "On-time certificate",
      value: completedLoans > 0 ? "Ready" : "After first repayment",
      active: completedLoans > 0,
    },
    {
      label: "Monthly report",
      value: transactions.length > 0 ? "Available" : "Build activity",
      active: transactions.length > 0,
    },
    {
      label: "Higher marketplace limits",
      value: user?.kycVerified && score >= 70 ? "Eligible" : "Improve score",
      active: Boolean(user?.kycVerified && score >= 70),
    },
  ];
}
