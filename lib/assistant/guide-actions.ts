/**
 * Me2U Guide deep-link actions (project-brain phase D foundation).
 *
 * Maps a user question to safe in-app destinations so the Guide can act
 * as the app itself by pointing at the exact flow. Navigation only: the
 * Guide never moves money, submits KYC, or changes settings.
 */

export type GuideAction = {
  label: string;
  href: string;
};

type GuideActionRule = {
  pattern: RegExp;
  actions: GuideAction[];
};

const maxActions = 3;

const guideActionRules: GuideActionRule[] = [
  {
    pattern: /withdraw|cash out/i,
    actions: [
      { label: "Open Withdraw", href: "/withdraw" },
      { label: "Check wallet balance", href: "/wallet" },
    ],
  },
  {
    pattern: /\bkyc\b|verif|identity|nin|bvn|passport/i,
    actions: [{ label: "Continue KYC", href: "/kyc" }],
  },
  {
    pattern: /loan|borrow|repay/i,
    actions: [
      { label: "Open Loans", href: "/loans" },
      { label: "Browse marketplace", href: "/marketplace" },
    ],
  },
  {
    pattern: /trust score|credit level|tier/i,
    actions: [{ label: "View dashboard", href: "/dashboard" }],
  },
  {
    pattern: /refer|invite|reward/i,
    actions: [{ label: "Open Referrals", href: "/referrals" }],
  },
  {
    pattern: /sav(e|ings)|goal/i,
    actions: [{ label: "Open Savings", href: "/savings" }],
  },
  {
    pattern: /circle|group lending/i,
    actions: [{ label: "Open Circles", href: "/circles" }],
  },
  {
    pattern: /bill|airtime|data|utility|electricity/i,
    actions: [{ label: "Pay a bill", href: "/bills" }],
  },
  {
    pattern: /deal|merchant|discount/i,
    actions: [{ label: "Browse deals", href: "/deals" }],
  },
  {
    pattern: /learn|lesson|education/i,
    actions: [{ label: "Open Learn", href: "/learn" }],
  },
  {
    pattern: /secur|pin|freeze/i,
    actions: [{ label: "Open Security", href: "/security" }],
  },
  {
    pattern: /support|contact|complaint|fraud|scam|dispute/i,
    actions: [{ label: "Contact support", href: "/support" }],
  },
  {
    pattern: /wallet|fund|balance/i,
    actions: [{ label: "Open Wallet", href: "/wallet" }],
  },
  {
    pattern: /profile|account|setting/i,
    actions: [{ label: "Open Profile", href: "/profile" }],
  },
];

export function getGuideActions(
  message: string,
  route?: string,
  limit = maxActions,
): GuideAction[] {
  if (!message) return [];
  const seen = new Set<string>();
  const actions: GuideAction[] = [];

  for (const rule of guideActionRules) {
    if (!rule.pattern.test(message)) continue;
    for (const action of rule.actions) {
      if (action.href === route || seen.has(action.href)) continue;
      seen.add(action.href);
      actions.push(action);
      if (actions.length >= Math.max(1, limit)) return actions;
    }
  }

  return actions;
}
