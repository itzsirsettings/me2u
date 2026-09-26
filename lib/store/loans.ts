import { postAuthenticatedJson } from "./api";
import type { AppStore, StoreSlice } from "./types";

import { repeatPlatformLoanMinimum } from "@/lib/loans";

type LoansSlice = Pick<AppStore, "requestPlatformLoan" | "repayLoan" | "payBill">;

export const createLoansSlice: StoreSlice<LoansSlice> = (set, get) => ({
  requestPlatformLoan: async (amount, days) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };
    if (!user.kycVerified)
      return { ok: false, error: "Complete your KYC before taking a loan." };
    if (!user.registrationDepositPaid)
      return {
        ok: false,
        error: "Confirm your registration deposit before requesting a loan.",
      };
    const platformLoans = get().activeLoans.filter(
      (loan) => loan.role === "borrower" && loan.source === "platform",
    );
    if (platformLoans.some((loan) => loan.status === "active"))
      return { ok: false, error: "Repay your active loan before requesting another one." };
    if (!Number.isFinite(amount) || Number(amount) < repeatPlatformLoanMinimum)
      return {
        ok: false,
        error: `Loans start from ₦${repeatPlatformLoanMinimum.toLocaleString()}.`,
      };
    const result = await postAuthenticatedJson("/api/loans/request", { amount, days });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
  repayLoan: async (loanId) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };
    const loan = get().activeLoans.find((item) => item.id === loanId);
    if (!loan || loan.status === "completed" || loan.role !== "borrower")
      return { ok: false, error: "This loan cannot be repaid from this account." };
    const repaymentAmount = loan.amount + (loan.amount * loan.rate) / 100;
    if (user.balance < repaymentAmount)
      return { ok: false, error: "Insufficient balance to repay this loan." };
    const result = await postAuthenticatedJson("/api/loans/repay", { loanId });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
  payBill: async (amount, serviceLabel, detail, pin) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };
    if (!user.kycVerified) return { ok: false, error: "Complete your KYC before transacting." };
    const result = await postAuthenticatedJson("/api/wallet/pay-bill", {
      amount,
      serviceLabel,
      detail,
      pin,
    });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
});
