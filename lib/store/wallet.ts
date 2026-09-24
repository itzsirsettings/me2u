import { postAuthenticatedJson } from "./api";
import { toErrorMessage } from "./helpers";
import type { AppStore, StoreSlice } from "./types";

import { registrationDepositAmount, getActivePlatformLoanRetainedDeposit } from "@/lib/loans";
import { withdrawalFeeAmount } from "@/lib/revenue";
import { uploadPrivateImage } from "@/lib/uploads";
import { getRequiredWithdrawalBalance } from "@/lib/withdrawal";


type WalletSlice = Pick<AppStore, "fundWallet" | "confirmRegistrationDeposit" | "withdraw">;

export const createWalletSlice: StoreSlice<WalletSlice> = (set, get) => ({
  fundWallet: async (amount, reference, receiptFile) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };
    const normalizedReference = reference.trim();
    if (normalizedReference.length < 4 || normalizedReference.length > 120)
      return { ok: false, error: "Enter a valid payment reference." };
    let receiptImageUrl = "";
    if (receiptFile) {
      try {
        receiptImageUrl = await uploadPrivateImage("receipts", user.id, receiptFile);
      } catch (error) {
        return { ok: false, error: toErrorMessage(error) };
      }
    }
    const result = await postAuthenticatedJson("/api/wallet/fund", {
      amount,
      reference: normalizedReference,
      receiptImageUrl,
    });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
  confirmRegistrationDeposit: async (reference, receiptFile) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };
    if (user.registrationDepositPaid)
      return { ok: false, error: "Registration deposit is already confirmed." };
    const normalizedReference = reference.trim();
    if (normalizedReference.length < 4 || normalizedReference.length > 120)
      return { ok: false, error: "Enter a valid payment reference." };
    let receiptImageUrl = "";
    if (receiptFile) {
      try {
        receiptImageUrl = await uploadPrivateImage("receipts", user.id, receiptFile);
      } catch (error) {
        return { ok: false, error: toErrorMessage(error) };
      }
    }
    const result = await postAuthenticatedJson("/api/onboarding/registration-deposit", {
      reference: normalizedReference,
      receiptImageUrl,
    });
    if (result.ok) {
      const refreshed = await get().loadCurrentUser();
      if (!refreshed.ok) return refreshed;
    }
    return result;
  },
  withdraw: async (amount, pin) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };
    if (!user.kycVerified) return { ok: false, error: "Complete your KYC before transacting." };
    if (!user.registrationDepositPaid)
      return {
        ok: false,
        error: `Confirm your ₦${registrationDepositAmount.toLocaleString()} registration deposit before withdrawal.`,
      };
    const platformLoanDeposit = getActivePlatformLoanRetainedDeposit(get().activeLoans);
    const requiredBalance = getRequiredWithdrawalBalance(amount, platformLoanDeposit);
    if (user.balance < requiredBalance) {
      const shortfall = Math.max(0, requiredBalance - user.balance);
      return {
        ok: false,
        error:
          platformLoanDeposit > 0
            ? `Fund ₦${shortfall.toLocaleString()} first. ₦${platformLoanDeposit.toLocaleString()} must remain while a loan is active, plus the ₦${withdrawalFeeAmount.toLocaleString()} fee.`
            : `Insufficient balance for the withdrawal and ₦${withdrawalFeeAmount.toLocaleString()} processing fee.`,
      };
    }
    const result = await postAuthenticatedJson("/api/wallet/withdraw", { amount, pin });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
});
