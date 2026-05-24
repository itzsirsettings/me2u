import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getReferralProgramProgress } from "@/lib/product-features";
import type { AssistantCitation } from "@/lib/assistant/knowledge";

export type AssistantAccountContext = {
  userId: string;
  summary: string;
  citations: AssistantCitation[];
};

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

export async function getAssistantAccountContext(accessToken?: string | null): Promise<AssistantAccountContext | null> {
  const token = accessToken?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const supabase = getSupabaseAdminClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    throw new Error("Session expired. Please log in again.");
  }

  const [profileResult, walletResult, loansResult, notificationsResult, marketplaceResult, rewardsResult, securityResult] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("loans")
        .select("id, amount, rate, days, status, funding_source, due_date, borrower_id, lender_id")
        .or(`borrower_id.eq.${user.id},lender_id.eq.${user.id}`)
        .order("created_at", { ascending: false }),
      supabase.from("notifications").select("id, title, is_read").eq("user_id", user.id),
      supabase.from("marketplace_items").select("id, type, amount, status").eq("author_id", user.id),
      supabase.from("affiliate_rewards").select("id, amount, created_at").eq("referrer_id", user.id),
      supabase.from("user_security_settings").select("wallet_frozen, trusted_device_label").eq("user_id", user.id).maybeSingle(),
    ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (walletResult.error) throw new Error(walletResult.error.message);

  const profile = profileResult.data;
  if (!profile) return null;

  const loans = loansResult.data || [];
  const notifications = notificationsResult.data || [];
  const marketplace = marketplaceResult.data || [];
  const rewards = rewardsResult.data || [];
  const referralProgress = getReferralProgramProgress({
    verifiedReferralCount: rewards.length,
    affiliateEarnings: rewards.reduce((total, reward) => total + Number(reward.amount || 0), 0),
  });
  const activeLoans = loans.filter((loan) => loan.status === "active");
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const activeMarketplaceItems = marketplace.filter((item) => item.status === "active").length;

  const summary = [
    `Account context for the logged-in user. Use only as a safe summary, not as raw private data.`,
    `Name: ${profile.first_name}. Email: ${maskEmail(profile.email)}. Phone: ${maskPhone(profile.phone)}.`,
    `KYC verified: ${profile.kyc_verified ? "yes" : "no"}. Registration deposit paid: ${profile.registration_deposit_paid ? "yes" : "no"}.`,
    `Wallet balance: ${money(walletResult.data?.balance)}. Locked balance: ${money(walletResult.data?.locked)}.`,
    `Trust score: ${profile.trust_score}. Country: ${profile.country_code}. Language: ${profile.preferred_language}.`,
    `Active loans: ${activeLoans.length}. Loan roles: ${activeLoans.map((loan) => loan.borrower_id === user.id ? "borrower" : "lender").join(", ") || "none"}.`,
    `Referral progress: ${referralProgress.verifiedReferralCount} verified referrals, ${money(referralProgress.totalEarned)} earned.`,
    `Marketplace listings owned by user: ${marketplace.length}. Active listings: ${activeMarketplaceItems}.`,
    `Unread notifications: ${unreadCount}. Transaction PIN: ${profile.transaction_pin ? "set" : "not set"}. Group lending: ${profile.group_lending_enabled ? "enabled" : "disabled"}.`,
    `Wallet frozen: ${securityResult.data?.wallet_frozen ? "yes" : "no"}. Trusted device label: ${securityResult.data?.trusted_device_label ? "set" : "not set"}.`,
    `Sensitive fields redacted: account number, NIN, OTPs, PINs, private files, auth tokens, admin-only data.`,
  ].join("\n");

  return {
    userId: user.id,
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
