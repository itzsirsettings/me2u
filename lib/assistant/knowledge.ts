import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  companyInfo,
  legalDocuments,
  supportDocuments,
  type PolicyDocument,
  type PolicySection,
} from "@/lib/legal-content";
import {
  financialEducationLessons,
  globalCountryOptions,
  growthFeatureModules,
  mobileAppReadiness,
  referralProgramLevels,
  visibleSecurityFeatures,
} from "@/lib/product-features";
import {
  registrationDepositAmount,
  repeatPlatformLoanMinimum,
} from "@/lib/loans";
import { withdrawalFeeAmount } from "@/lib/revenue";

export type AssistantKnowledgeItem = {
  id: string;
  title: string;
  sourceType: "document" | "policy" | "feature" | "route" | "rule" | "support";
  sourcePath: string;
  routeHref: string;
  updatedAt: string;
  content: string;
};

export type AssistantCitation = {
  id: string;
  title: string;
  sourceType: AssistantKnowledgeItem["sourceType"] | "account";
  routeHref?: string;
};

export type RetrievedKnowledge = {
  item: AssistantKnowledgeItem;
  score: number;
};

const currentUpdatedAt = "2026-05-24";
let cachedKnowledge: AssistantKnowledgeItem[] | null = null;

function readProductContext() {
  const fullPath = join(process.cwd(), "PRODUCT.md");
  if (!existsSync(fullPath)) return "";
  return readFileSync(fullPath, "utf8").trim();
}

function readDesignContext() {
  const fullPath = join(process.cwd(), "design.md");
  if (!existsSync(fullPath)) return "";
  return readFileSync(fullPath, "utf8").trim();
}

function flattenPolicySections(sections: PolicySection[], prefix = ""): string[] {
  return sections.flatMap((section) => {
    const title = prefix ? `${prefix}: ${section.title}` : section.title;
    const lines = [
      title,
      ...(section.paragraphs || []),
      ...(section.bullets || []),
    ];

    return [
      lines.join("\n"),
      ...flattenPolicySections(section.subsections || [], title),
    ];
  });
}

function policyToKnowledge(document: PolicyDocument, sourceType: "policy" | "support"): AssistantKnowledgeItem {
  const baseHref = sourceType === "support" ? "/support" : "/legal";
  const routeHref =
    sourceType === "support"
      ? document.slug === "support"
        ? "/support"
        : `/support/${document.slug}`
      : document.slug === "legal-information"
        ? "/legal"
        : `/legal/${document.slug}`;

  return {
    id: `${sourceType}:${document.slug}`,
    title: document.title,
    sourceType,
    sourcePath: sourceType === "support" ? "lib/legal-content.ts#supportDocuments" : "lib/legal-content.ts#legalDocuments",
    routeHref: routeHref || baseHref,
    updatedAt: document.lastUpdated,
    content: [
      document.title,
      document.summary,
      ...flattenPolicySections(document.sections),
    ].join("\n\n"),
  };
}

function makeRule(id: string, title: string, routeHref: string, content: string): AssistantKnowledgeItem {
  return {
    id: `rule:${id}`,
    title,
    sourceType: "rule",
    sourcePath: "lib/assistant/knowledge.ts",
    routeHref,
    updatedAt: currentUpdatedAt,
    content,
  };
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/₦/g, " naira ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  const tokens = normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 2);
  const expanded = tokens.flatMap((token) => {
    const variants = [token];
    if (token.endsWith("s")) variants.push(token.slice(0, -1));
    if (token === "start" || token === "started" || token === "begin") variants.push("onboarding", "register", "registration", "signup", "account");
    if (token === "signup" || token === "sign" || token === "register") variants.push("onboarding", "registration", "account");
    if (token.startsWith("withdraw")) variants.push("withdraw", "withdrawal", "withdrawals");
    if (token.startsWith("deposit")) variants.push("deposit", "deposits");
    if (token.startsWith("loan")) variants.push("loan", "loans");
    if (token === "verification" || token === "verify" || token === "verified") variants.push("kyc");
    return variants;
  });

  return [...new Set(expanded)];
}

function getIntentBoost(queryTokens: Set<string>, item: AssistantKnowledgeItem) {
  const id = item.id.toLowerCase();
  const route = item.routeHref.toLowerCase();
  let boost = 0;

  if (queryTokens.has("withdraw") && (id.includes("withdraw") || route.includes("withdraw"))) boost += 20;
  if (queryTokens.has("kyc") && (id.includes("kyc") || route.includes("kyc"))) boost += 18;
  if (queryTokens.has("deposit") && id.includes("onboarding")) boost += 12;
  if ((queryTokens.has("start") || queryTokens.has("started") || queryTokens.has("begin") || queryTokens.has("onboarding")) && id.includes("onboarding")) boost += 24;
  if ((queryTokens.has("signup") || queryTokens.has("register") || queryTokens.has("registration")) && (id.includes("onboarding") || route.includes("register"))) boost += 20;
  if (queryTokens.has("loan") && (id.includes("loan") || route.includes("loan"))) boost += 18;
  if (queryTokens.has("wallet") && (id.includes("wallet") || route.includes("wallet"))) boost += 14;
  if (queryTokens.has("referral") && (id.includes("referral") || route.includes("referral"))) boost += 14;
  if (queryTokens.has("support") && (id.includes("support") || route.includes("support"))) boost += 12;
  if (queryTokens.has("security") && (id.includes("security") || route.includes("security"))) boost += 12;

  return boost;
}

export function getAssistantKnowledge() {
  if (cachedKnowledge) return cachedKnowledge;

  const product = readProductContext();
  const design = readDesignContext();

  cachedKnowledge = [
    {
      id: "document:product",
      title: "Me2U product context",
      sourceType: "document",
      sourcePath: "PRODUCT.md",
      routeHref: "/",
      updatedAt: currentUpdatedAt,
      content: product || "Me2U is a secure interest-free peer lending, wallet, KYC, referral, and support app.",
    },
    {
      id: "document:design",
      title: "Me2U app UI and theme behavior",
      sourceType: "document",
      sourcePath: "design.md",
      routeHref: "/profile",
      updatedAt: currentUpdatedAt,
      content: design || "Me2U uses light and dark themes, mobile cards, bottom navigation, and support pages.",
    },
    ...legalDocuments.map((document) => policyToKnowledge(document, "policy")),
    ...supportDocuments.map((document) => policyToKnowledge(document, "support")),
    {
      id: "feature:growth-modules",
      title: "Me2U feature modules",
      sourceType: "feature",
      sourcePath: "lib/product-features.ts#growthFeatureModules",
      routeHref: "/learn",
      updatedAt: currentUpdatedAt,
      content: growthFeatureModules.map((item) => `${item.title}: ${item.body} Status: ${item.status}.`).join("\n"),
    },
    {
      id: "feature:education",
      title: "Me2U financial education lessons",
      sourceType: "feature",
      sourcePath: "lib/product-features.ts#financialEducationLessons",
      routeHref: "/learn",
      updatedAt: currentUpdatedAt,
      content: financialEducationLessons.map((item) => `${item.title}: ${item.outcome} Duration: ${item.duration}.`).join("\n"),
    },
    {
      id: "feature:security",
      title: "Me2U visible security features",
      sourceType: "feature",
      sourcePath: "lib/product-features.ts#visibleSecurityFeatures",
      routeHref: "/security",
      updatedAt: currentUpdatedAt,
      content: visibleSecurityFeatures.map((item) => `${item.title}: ${item.detail}`).join("\n"),
    },
    {
      id: "feature:referrals",
      title: "Me2U referral program levels",
      sourceType: "feature",
      sourcePath: "lib/product-features.ts#referralProgramLevels",
      routeHref: "/referrals",
      updatedAt: currentUpdatedAt,
      content: referralProgramLevels.map((level) => `${level.name}: ${level.summary}. Reward: ${level.reward}. Badge: ${level.badge}.`).join("\n"),
    },
    {
      id: "feature:global-readiness",
      title: "Me2U country and app readiness",
      sourceType: "feature",
      sourcePath: "lib/product-features.ts#globalCountryOptions",
      routeHref: "/register",
      updatedAt: currentUpdatedAt,
      content: [
        ...globalCountryOptions.map((country) => `${country.name}: ${country.lendingStatus}. ${country.kycSummary}`),
        ...mobileAppReadiness.map((item) => `${item.title}: ${item.status}. ${item.detail}`),
      ].join("\n"),
    },
    makeRule(
      "withdrawals",
      "Withdrawal requirements",
      "/withdraw",
      `Withdrawals require login, completed KYC, confirmed registration deposit, enough available wallet balance, no retained active-loan balance conflict, and the ₦${withdrawalFeeAmount.toLocaleString()} withdrawal processing fee.`,
    ),
    makeRule(
      "loans",
      "Loan requirements",
      "/loans",
      `Me2U offers 0% interest loan workflows. Repeat direct loans start from ₦${repeatPlatformLoanMinimum.toLocaleString()}. Users need KYC, confirmed registration deposit, and no active unpaid direct loan before requesting another direct loan.`,
    ),
    makeRule(
      "onboarding",
      "Protected onboarding",
      "/dashboard",
      `Protected onboarding includes email verification, account registration, the ₦${registrationDepositAmount.toLocaleString()} registration deposit, KYC, wallet setup, trust score signals, and security setup before higher-risk features are available.`,
    ),
    makeRule(
      "support-contact",
      "Official Me2U support contact",
      "/support",
      `Official support email: ${companyInfo.email}. Official support phone or WhatsApp: ${companyInfo.phones.join(", ")}. Company: ${companyInfo.legalName}.`,
    ),
    makeRule(
      "read-only-assistant",
      "Me2U Guide safety boundary",
      "/support",
      "Me2U Guide is a read-only assistant. It can explain app rules and user status, but it cannot move money, submit KYC, approve requests, change settings, reveal OTPs, reveal PINs, or replace official support review.",
    ),
  ];

  return cachedKnowledge;
}

export function retrieveAssistantKnowledge(query: string, limit = 6): RetrievedKnowledge[] {
  const tokens = tokenize(query);
  const tokenSet = new Set(tokens);

  if (tokens.length === 0) return [];

  return getAssistantKnowledge()
    .map((item) => {
      const haystack = tokenize(`${item.id}\n${item.title}\n${item.routeHref}\n${item.content}`);
      const score = haystack.reduce((total, token) => total + (tokenSet.has(token) ? 1 : 0), 0);
      const phraseBonus = normalizeText(item.content).includes(normalizeText(query).slice(0, 80)) ? 5 : 0;
      return { item, score: score + phraseBonus + getIntentBoost(tokenSet, item) };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, limit));
}

export function toCitation(item: AssistantKnowledgeItem): AssistantCitation {
  return {
    id: item.id,
    title: item.title,
    sourceType: item.sourceType,
    routeHref: item.routeHref,
  };
}

export function getSupportContactSummary() {
  return {
    email: companyInfo.email,
    phones: companyInfo.phones,
    company: companyInfo.legalName,
  };
}
