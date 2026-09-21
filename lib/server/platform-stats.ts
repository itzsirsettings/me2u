import { query } from "@/lib/railway/client";

export type PlatformStats = {
  totalBorrowed: number;
  totalRepaid: number;
  activeCircles: number;
  totalUsers: number;
  successfulLoans: number;
  totalLent: number;
  activeLoans: number;
  trustScoreAvg: number | null;
};

/** Aggregate source records in one snapshot; an empty community has no average score. */
export async function getPlatformStats(): Promise<PlatformStats> {
  const { rows } = await query<{
    total_borrowed: string;
    total_repaid: string;
    successful_loans: string;
    active_loans: string;
    active_circles: string;
    total_users: string;
    trust_score_avg: string | null;
  }>(`SELECT
    COALESCE(SUM(amount), 0)::text AS total_borrowed,
    COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0)::text AS total_repaid,
    COUNT(*) FILTER (WHERE status = 'completed')::text AS successful_loans,
    COUNT(*) FILTER (WHERE status = 'active')::text AS active_loans,
    (SELECT COUNT(*)::text FROM circles) AS active_circles,
    (SELECT COUNT(*)::text FROM profiles) AS total_users,
    (SELECT ROUND(AVG(trust_score))::text FROM profiles WHERE kyc_verified = true) AS trust_score_avg
  FROM loans`);
  const row = rows[0];
  if (!row) throw new Error("Platform statistics query returned no result.");

  return {
    totalBorrowed: Number(row.total_borrowed),
    totalRepaid: Number(row.total_repaid),
    activeCircles: Number(row.active_circles),
    totalUsers: Number(row.total_users),
    successfulLoans: Number(row.successful_loans),
    totalLent: Number(row.total_borrowed),
    activeLoans: Number(row.active_loans),
    trustScoreAvg: row.trust_score_avg === null ? null : Number(row.trust_score_avg),
  };
}
