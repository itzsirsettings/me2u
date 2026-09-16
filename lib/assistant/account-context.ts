import { verifyToken } from "@/lib/railway/auth";
import { query } from "@/lib/railway/client";
import { getReferralProgramProgress } from "@/lib/product-features";
import type { AssistantCitation } from "@/lib/assistant/knowledge";

export type AssistantAccountContext = {
  userId: string;
  summary: string;
  citations: AssistantCitation[];
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  kyc_verified: boolean;
  registration_deposit_paid: boolean;
  trust_score: number;
  country_code: string | null;
  preferred_language: string | null;
  transaction_pin: string | null;
  group_lending_enabled: boolean;
};

type WalletRow = { balance: number; locked: number };
type LoanRow = {
  id: string;
  status: string;
  borrower_id: string;
  lender_id: string | null;
};
type NotificationRow = { id: string; is_read: boolean };
type MarketplaceRow = { id: string; status: string };
type RewardRow = { id: string; amount: number };
type SecurityRow = { wallet_frozen: boolean; trusted_device_label: string | null };

function maskEmail(email?: string | null) {
  if (!email || !email.includes("@")) return "not available";
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone?: string | null) {
  if (!phone) return "not available";
  return phone.length > 4 ? `${phone.slice(0, 3)}***${phone.slice(-2)}` : "***";
}

function money(value: unknown) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

export async function getAssistantAccountContext(
  accessToken?: string | null,
): Promise<AssistantAccountContext | null> {
  const token = accessToken?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) throw new Error("Session expired. Please log in again.");

  const userId = payload.userId;

  const [
    profileResult,
    walletResult,
    loansResult,
    notificationsResult,
    marketplaceResult,
    rewardsResult,
    securityResult,
  ] = await Promise.all([
    query<any>(`SELECT * FROM profiles WHERE id = $1`, [userId]),
    query<any>(`SELECT balance, locked FROM wallets WHERE user_id = $1`, [userId]),
    query<any>(
      `SELECT id, amount, rate, days, status, funding_source, due_date, borrower_id, lender_id
       FROM loans
       WHERE borrower_id = $1 OR lender_id = $1
       ORDER BY created_at DESC`,
      [userId],
    ),
    query<any>(`SELECT id, title, is_read FROM notifications WHERE user_id = $1`, [userId]),
    query<any>(
      `SELECT id, type, amount, status FROM marketplace_items WHERE author_id = $1`,
      [userId],
    ),
    query<any>(
      `SELECT id, amount, created_at FROM affiliate_rewards WHERE referrer_id = $1`,
      [userId],
    ),
    query<any>(
      `SELECT wallet_frozen, trusted_device_label FROM user_security_settings WHERE user_id = $1`,
      [userId],
    ),
  ]);

  const profile = profileResult.rows[0];
  if (!profile) return null;

  const wallet = walletResult.rows[0];
  const loans = loansResult.rows;
  const notifications = notificationsResult.rows;
  const marketplace = marketplaceResult.rows;
  const rewards = rewardsResult.rows;
  const security = securityResult.rows[0];

  const referralProgress = getReferralProgramProgress({
    verifiedReferralCount: rewards.length,
    affiliateEarnings: rewards.reduce(
      (total: number, reward: any) => total + Number(reward.amount || 0),
      0,
    ),
  });

  const activeLoans = loans.filter((l: any) => l.status === "active");
  const unreadCount = notifications.filter((n: any) => !n.is_read).length;
  const activeMarketplaceItems = marketplace.filter((i: any) => i.status === "active").length;

  const summary = [
    `Account context for the logged-in user. Use only as a safe summary, not as raw private data.`,
    `Name: ${profile.first_name}. Email: ${maskEmail(profile.email)}. Phone: ${maskPhone(profile.phone)}.`,
    `KYC verified: ${profile.kyc_verified ? "yes" : "no"}. Registration deposit paid: ${profile.registration_deposit_paid ? "yes" : "no"}.`,
    `Wallet balance: ${money(wallet?.balance)}. Locked balance: ${money(wallet?.locked)}.`,
    `Trust score: ${profile.trust_score}. Country: ${profile.country_code}. Language: ${profile.preferred_language}.`,
    `Active loans: ${activeLoans.length}. Loan roles: ${activeLoans.map((l: any) => l.borrower_id === userId ? "borrower" : "lender").join(", ") || "none"}.`,
    `Referral progress: ${referralProgress.verifiedReferralCount} verified referrals, ${money(referralProgress.totalEarned)} earned.`,
    `Marketplace listings owned by user: ${marketplace.length}. Active listings: ${activeMarketplaceItems}.`,
    `Unread notifications: ${unreadCount}. Transaction PIN: ${profile.transaction_pin ? "set" : "not set"}. Group lending: ${profile.group_lending_enabled ? "enabled" : "disabled"}.`,
    `Wallet frozen: ${security?.wallet_frozen ? "yes" : "no"}. Trusted device label: ${security?.trusted_device_label ? "set" : "not set"}.`,
    `Sensitive fields redacted: account number, NIN, OTPs, PINs, private files, auth tokens, admin-only data.`,
  ].join("\n");

  return {
    userId,
    summary,
    citations: [
      {
        id: "account:summary",
        title: "Your Me2U account summary",
        sourceType: "account",
        routeHref: "/profile",
      },
    ],
  };
}
